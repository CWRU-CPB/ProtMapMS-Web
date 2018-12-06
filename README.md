To build the image, clone the repository and change to the directory where you
cloned the project. Run the command:

`sudo docker build -t protmapweb .`

You can then run the image in a container by running the command:

`sudo docker run -p=8090:80 --name protmapweb-container protmapweb`

which will listen for connections on port 8090 of the Docker container host.