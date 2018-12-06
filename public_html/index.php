<?php
$path = "/var/www/html/protmap";
$PIN  = "replace";

function getTempFileName() {
	list($usec, $sec) = explode(" ", microtime());
	while(file_exists("/tmp/protmap_".$sec."_".$usec)) {
		list($usec, $sec) = explode(" ", microtime());
	}
	return "/tmp/protmap_".$sec."_".$usec;
}

function validate($str) {
	if(preg_match("/[A-Za-z0-9_\.]+/",$str) === 1) {
		return $str;
	}
	else {
		return null;
	}
}

function getBaseURL() {
	return (isset($_SERVER['HTTPS']) ? "https" : "http") . 
		"://$_SERVER[HTTP_HOST]" .
		parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
}

function handlePUT() {
	global $path;

	/* Parse project and file names from the query string */
	parse_str($_SERVER['QUERY_STRING'],$qs);
	$project = validate($qs["project"]);
	$file = validate($qs["file"]);
	error_log("Project=".$project);
	error_log("File=".$file);

	/* Adapted from http://www.php.net/manual/en/features.file-upload.put-method.php */

	/* PUT data comes in on the stdin stream */
	$putdata = fopen("php://input", "r");

	/* Get a unique temp file name */
	$tmp = getTempFileName();

	/* Open a file for writing */
	$fp = fopen($tmp, "w");

	/* Read the data 1 KB at a time
	   and write to the file */
	while ($data = fread($putdata, 1024))
	  fwrite($fp, $data);

	/* Close the streams */
	fclose($fp);
	fclose($putdata);

	/* * * * * * * * * * * * * * End adapted * * * * * * * * * * * * * *  * * * * * */
	
	/* Create project if it does not exist */
	if(!file_exists($path."/results/".$project)) {
		/* Create directory */
		if(!mkdir($path."/results/".$project)) {
			error_log("Could not create project directory $path/data/$project");
			return;
		}
	
		/* Create database record */
		$date = new DateTime();
		$db = new SQLite3("data/results.db");
		$db->query("INSERT INTO results VALUES('".$project."',".$date->getTimestamp().")");
		$db->close();

	}

	/* Move uploaded file to project directory */
	if(!rename($tmp,$path."/results/".$project."/".$file)) {
		error_log("Could not move $tmp to $path/data/$project/$file");
	}

}

function deleteProject($name) {
	global $path;

	/* Validate project id is path */
	$project_path = $path."/results/".validate($name);
	if(!file_exists($project_path)) {
		return false;
	}

	/* Remove all files and project directory */
	$files = scandir($project_path);
	foreach($files as $index => $file) {
		if($file === "." || $file === "..") {
			continue;
		}

		if(!unlink($project_path."/".$file)) {
			return false;
		}
	}
	$status = rmdir($project_path);
	
	/* Remove record form database */
	$db = new SQLite3("data/results.db");
	$db->query("DELETE FROM results WHERE project='".validate($name)."'");
	$db->close();

	return $status;
}

function writePinForm() {
	print('<!DOCTYPE html>
<html>
  <head>
    <title>ProtMapMS3 - Web</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="viewer/css/bootstrap.min.css">
    <style type="text/css">
      table{width:100%}
      tr:hover {background:#efefef}
      .footer{position:fixed;bottom:0px;left:0px;width:100%;text-align:center}
    </style>
  </head>
  <body>
    <h1>Enter Your PIN Number</h1>
    <form method="post" action="">
      <label> PIN: <input type="text" value="" name="pin" /></label><br/>
      <input type="submit" value="Submit"/>
    </form>
  </body>
</html>');
}

function listResults() {
	global $path;

	# Start of result list 
	print('<!DOCTYPE html>
<html>
  <head>
    <title>ProtMapMS3 - Web</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="viewer/css/bootstrap.min.css">
    <style type="text/css">
      table{width:100%}
      tr:hover {background:#efefef}
      .footer{position:fixed;bottom:0px;left:0px;width:100%;text-align:center}
    </style>
  </head>
  <body>
    <h1>Results</h1>
    <table>
      <tr>
        <th>Project</th>
        <th>Date</th>
        <th>Actions</th>
      </tr>
');
        
	$db = new SQLite3("data/results.db");
	$results = $db->query('SELECT * FROM results ORDER BY date DESC');
	while ($row = $results->fetchArray()) {
		$dateString = date("Y-m-d H:i:s",$row[1]);
		print "      <tr>\n";
		print "        <td><a href=\"viewer.html?id=".$row[0]."\">".$row[0]."</a></td>\n";
		print "        <td>".$dateString."</td>\n";
		print "        <td><a href=\"index.php?delete=".$row[0]."\">Delete</a></td>\n";
		print "      </tr>\n";
	}
	$db->close();

	# End of result list
	print '    </table>
    <div class="footer">Copyright 2018 <a href="http://www.case.edu/">Case Western Reserve University</a></div>
  </body>
</html>';

}

function handleGET() {
	global $path;

	if(isset($_GET["test"])) {
		error_log("Received test request");
		print "1\n";
	}
	elseif(isset($_GET["file"]) && isset($_GET["project"])) {
		readfile($path."/results/".$_GET["project"]."/".$_GET["file"]);
	}
	elseif(isset($_GET["delete"])) {
		if(deleteProject($_GET["delete"])) {			
			header('Location: '.getBaseURL());
			die();
		}
		else {
			print "0\n";
		}
	}
	else {
		listResults();
	}
}

# Validate that the database file has been created
if(!file_exists($path."/data/results.db")) {
    error_log("Creating database data/results.db");
    $db = new SQLite3("data/results.db");
    $db->exec('CREATE TABLE results (project VARCHAR(128), date DATETIME)');
    $db->close();
}

# Use session to track authorized
session_start();

# Simple PIN based authorization
$method = $_SERVER['REQUEST_METHOD'];
if($method == "POST") {
	if($_POST["pin"] === $PIN) {
		$_SESSION["authorized"] = TRUE;
		header('Location: '.getBaseURL());
		die();
	}
}

# If the request has no session and the correct pin is not being sent
# as part of the query string
parse_str($_SERVER['QUERY_STRING'],$qs);
if(!isset($_SESSION["authorized"]) && !(isset($qs["pin"]) && $qs["pin"] === $PIN)) {
  writePinForm();
}

# If authorization hasn't blocked the request, handle accordingly
elseif($method == "PUT") {
	handlePUT();
}
elseif($method == "GET") {
	handleGET();
}

?>
