var app = new Vue({
  el: '#app',
  "created" : function() {
    var params = this.parseUrlParameters();
    this.init(params["id"]);
    window.addEventListener("keydown",this.keyPressEvent);
  },
  data: {
    "peakAreas" : {},
    "chromatograms" : {},
    "identifications" : {},
    "accession" : "NULL",
    "threshold" : "1.5",
    "lastClicked" : null,
    "ms2Index" : 0
  },
  "computed" : {
      "peptideAreas" : function() {
          this.lastClicked=null;
          this.ms2Index=0;
          if(this.accession === "NULL") return [];

          var threshold = parseFloat(this.threshold);
          var peptideAreas = [];
          for(var peptideKey in this.peakAreas[this.accession]) {
              if(this.peakAreas[this.accession][peptideKey]["1.0000"] && Math.abs(this.peakAreas[this.accession][peptideKey]["1.0000"]["c-ratio"]) < threshold) continue;
              for(var spectrumKey in this.peakAreas[this.accession][peptideKey]) {
                  peptideAreas.push(this.peakAreas[this.accession][peptideKey][spectrumKey]);
              }
          }
          peptideAreas.sort(function (a,b) { if(a.p_start < b.p_start) return -1; else if(a.p_start == b.p_start && a.p_end == b.p_end && a.spectrum < b.spectrum) return -1; else return 1;});
          
          return peptideAreas;
      },
      "logScale" : function() {
          return this.scale==="log";
      }
  },
  "methods" : {
    /* Parse URL parameters (in a hurry, from https://html-online.com/articles/get-url-parameters-javascript/) */
    "parseUrlParameters" : function() {
      var vars = {};
      var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
      });
      return vars;
    },

    /**
     * Loads result data from JSON files into data members.
     */
    "init" : function(id) {
      var self = this;

      // Load peak areas
      axios.get("results/"+id+"/peak-areas.json")
        .then(function (response) {
          self.peakAreas = response.data;
        })
        .catch(function (error) {
          console.log(error);
        })
        .then(function () {

        });

      // Load chormatograms
      axios.get("results/"+id+"/chromatograms.json")
        .then(function (response) {
          self.chromatograms = response.data;
        })
        .catch(function (error) {
          console.log(error);
        })
        .then(function () {
        });
        
        // Load identifications
      axios.get("results/"+id+"/identifications.json")
        .then(function (response) {
          self.identifications = response.data;
        })
        .catch(function (error) {
          console.log(error);
        })
        .then(function () {

        });
    },
    "passFilter" : function(record) {
        return typeof record["c-ratio"] !== "undefined" && record["c-ratio"] >= 1.5; 
    },
    "geneName" : function(id) {
        if(id.indexOf("_") !== -1) return id.split("_")[1];
        else return id;
    },
    "maxLength" : function(s) {
        if(s.length > 10) {
            s = s.substring(0,7)+"...";
        }
        return s;
    },
    "title" : function(v) {
        return v.peptide+" ["+v.p_start+","+v.p_end+"]";
    },
    "getColor" : function(colorIndex) {
        switch(colorIndex) {
            case   0: return "#ff0000";   /* Red */
            case   1: return "#00ff00";   /* Green */
            case   2: return "#0000ff";   /* Blue */
            case   3: return "#ff00ff";   /* Violet */
            case   4: return "#ff7700";   /* Orange */
            case   5: return "#00ffff";   /* Cyan */
        }
    },
    "recordKey" : function(record) {
        return record.peptide+"_"+record.p_start+"_"+record.p_end+"_"+record.spectrum;
    },
    "render" : function(index,record) {
        this.lastClicked=index;
        this.drawChromatogram(record);
        this.render2(0,record);
    },
    "render2" : function(index,record) {
        var identifications = this.identifications[record.accession][record.peptide][record.spectrum];
        
        /* If no identifications in selected spectrum */
        if(identifications.length === 0) {
            console.log("No identifications in this spectrum");
            this.blankMS2();
            return;
        }
        
        if(index >= 0 && index < identifications.length) {
            this.ms2Index = index;
            this.drawMS2(identifications[index],record);
        }
    },
    "rowSelectedStyle" : function(index) {
        if(this.lastClicked === index)
            return {"background-color":"#00ff00"};
        else 
            return {};
    },
    "blankMS2" : function() {
        /* Full plot dimensions */
        var pwidth  = 800;
        var pheight = 380;
        
        var canvas = document.getElementById("ms2");
        var g = canvas.getContext('2d');
        g.fillStyle="#ffffff";
        g.fillRect(0, 0, pwidth, pheight);
        g.fillStyle="#000000";
        g.fillText("No MS2 identifications were made in this spectrum for this peptide",
                   20,
                   pheight/2);
    },
    "drawMS2" : function(identification,record) {
        /* Full plot dimensions */
        var pwidth  = 800;
        var pheight = 380;

        /* Axis margins */
        var marginH = 20;
        var marginV = 20;

        /* Axis width and height */
        var cwidth    = pwidth  - (2*marginH);
        var cheight   = pheight - (2*marginV);
        
        /* Find max intensity across chromatograms to draw to use as scaling 
         * factor */
        var maxIntensity = 0.0;
        var fromMZ = 999999999.0;
        var toMZ = 0.0;
        for(var i=0;i<identification.oions.mz.length;i++) {
            if(identification.oions.mz[i] < fromMZ) 
                fromMZ=identification.oions.mz[i];
            if(identification.oions.mz[i] > toMZ)
                toMZ=identification.oions.mz[i];
            if(identification.oions.I[i] > maxIntensity) 
                maxIntensity = identification.oions.I[i];
        }
        
        var canvas = document.getElementById("ms2");
        var g = canvas.getContext('2d');
        g.fillStyle="#ffffff";
        g.fillRect(0, 0, pwidth, pheight);
        
        var rtai = (toMZ-fromMZ)/20.0;
        
        /* Draw the RT axis scale indicators */
        g.font="10px Arial";
        for(var i=0;i<21;i++) {
            g.fillStyle="#000000";
            g.fillText(Math.floor((fromMZ+(i*rtai))),
                       Math.floor((i*(cwidth/20)))+marginH-5,
                       pheight-marginV+15);
            g.fillStyle="#555555";
            g.strokeStyle="#555555";
            g.beginPath();
            g.moveTo(Math.floor(i*(cwidth/20))+marginH,
                       pheight-marginV);
            g.lineTo(Math.floor(i*(cwidth/20))+marginH,
                      pheight-marginV+5);
            g.stroke();
        }
        
        /* Draw the intensity scale indicators */
        g.fillStyle="#000000";
        g.fillText(maxIntensity.toExponential(2), 5, marginV);
        g.fillText((maxIntensity/2).toExponential(2), 5, (pheight-marginV)/2);
        g.fillText("0", 5, pheight-marginV);

        /* Create the axis border */
        g.fillStyle="#555555";
        g.strokeRect(marginH,marginV,cwidth,cheight);
        
        /* Draw observed ions */
        for(var i=0;i<identification.oions.mz.length;i++) {
            var mz = identification.oions.mz[i];
            var I = identification.oions.I[i];
            
            g.strokeStyle="#0000ff";
            if(identification.tions.mz.includes(mz))
                g.strokeStyle="#ff0000";
            
            g.beginPath();
            g.moveTo(Math.floor((mz-fromMZ)/(toMZ-fromMZ)*cwidth)+marginH,
                     pheight-marginV);
            g.lineTo(Math.floor((mz-fromMZ)/(toMZ-fromMZ)*cwidth)+marginH,
                     Math.floor(cheight-(((I/maxIntensity)*cheight)))+marginV);
            g.stroke();
        }
        
        /* Add identification details */
        var baseX = marginH+10;
        var baseY = marginV+10;
        g.fillStyle="#0000ff";
        g.fillText("z="+identification.z+",scan="+identification.scan+",mods="+identification.mods,
                   baseX,
                   baseY);
        g.fillText(record.peptide+" m/z="+identification.mz.toFixed(4),
                   baseX,
                   baseY+15);
        g.fillText("r="+identification.score.toFixed(2),
                   baseX,
                   baseY+30);
    },
    "drawChromatogram" : function(record) {        
        /* Full plot dimensions */
        var pwidth  = 800;
        var pheight = 380;

        /* Axis margins */
        var marginH = 20;
        var marginV = 20;

        /* Axis width and height */
        var cwidth    = pwidth  - (2*marginH);
        var cheight   = pheight - (2*marginV);
        
        /* Find max intensity across chromatograms to draw to use as scaling 
         * factor */
        var maxIntensity = 0.0;
        var fromRT = 999999999.0;
        var toRT = 0.0;
        var ms1s = [];
        for(var mzKey in record.species) {
            var ms1 = new MS1Chromatogram(this.chromatograms[record.spectrum][mzKey]);
            if(ms1.RT(0) < fromRT) 
                fromRT=ms1.RT(0);
            if(ms1.RT(ms1.size()-1) > toRT)
                toRT=ms1.RT(ms1.size()-1);
            if(ms1.maxIntensity() > maxIntensity) 
                maxIntensity = ms1.maxIntensity();

            ms1s.push(ms1);
        }
        
        if(this.logScale) {
            maxIntensity = Math.log(maxIntensity+1);
        }
        
        var canvas = document.getElementById("ms1");
        var g = canvas.getContext('2d');
        g.fillStyle="#ffffff";
        g.fillRect(0, 0, pwidth, pheight);
        
        var rtai = (toRT-fromRT)/10.0;
        
        /* Draw the RT axis scale indicators */
        g.font="10px Arial";
        for(var i=0;i<11;i++) {
            g.fillStyle="#000000";
            g.fillText(Math.floor((fromRT+(i*rtai))/60),
                       Math.floor((i*(cwidth/10)))+marginH-5,
                       pheight-marginV+15);
            g.fillStyle="#555555";
            g.strokeStyle="#555555";
            g.beginPath();
            g.moveTo(Math.floor(i*(cwidth/10))+marginH,
                       pheight-marginV);
            g.lineTo(Math.floor(i*(cwidth/10))+marginH,
                      pheight-marginV+5);
            g.stroke();
        }
        
        /* Draw the intensity scale indicators */
        g.fillStyle="#000000";
        if(this.logScale) {
            g.fillText(Math.log(maxIntensity).toExponential(2), 5, marginV);
            g.fillText(Math.log(maxIntensity/2).toExponential(2), 5, (pheight-marginV)/2);
            g.fillText("1", 5, pheight-marginV);
        }
        else {
            g.fillText(maxIntensity.toExponential(2), 5, marginV);
            g.fillText((maxIntensity/2).toExponential(2), 5, (pheight-marginV)/2);
            g.fillText("0", 5, pheight-marginV);
        }

        /* Create the axis border */
        g.fillStyle="#555555";
        g.strokeRect(marginH,marginV,cwidth,cheight);

        /* Draw each chromatogram */
        ms1s.sort(function(a,b) {return a.compareTo(b,record);});
        var colorIndex = 0;
        for(var j=0;j<ms1s.length;j++) {
            var ms1 = ms1s[j];

            g.strokeStyle=this.getColor(colorIndex);
            g.fillStyle=g.strokeStyle;
            for(var i=1;i<ms1.size();i++) {
                if(this.logScale) {
                    g.beginPath();
                    g.moveTo(Math.floor((ms1.RT(i-1)-fromRT)/(toRT-fromRT)*cwidth)+marginH,
                             Math.floor(cheight-(((Math.log(ms1.Intensity(i-1)+1)/maxIntensity)*cheight)))+marginV);
                             
                    g.lineTo(Math.floor((ms1.RT(i)-fromRT)/(toRT-fromRT)*cwidth)+marginH,
                             Math.floor(cheight-(((Math.log(ms1.Intensity(i)+1)/maxIntensity)*cheight)))+marginV);
                    g.stroke();
                }
                else {
                    g.beginPath();
                    g.moveTo(Math.floor((ms1.RT(i-1)-fromRT)/(toRT-fromRT)*cwidth)+marginH,
                             Math.floor(cheight-(((ms1.Intensity(i-1)/maxIntensity)*cheight)))+marginV);
                    g.lineTo(Math.floor((ms1.RT(i)-fromRT)/(toRT-fromRT)*cwidth)+marginH,
                             Math.floor(cheight-(((ms1.Intensity(i)/maxIntensity)*cheight)))+marginV);
                    g.stroke();
                }
            }
            
            for(var k=0;k<record.species[ms1.key()].rti.length;k++) {
                var rt = record.species[ms1.key()].rti[k];
                var mzRtFrom = rt[0];
                var mzRtTo = rt[1];
                var x1 = Math.floor((mzRtFrom-fromRT)/(toRT-fromRT)*cwidth)+marginH;
                var x2 = Math.floor((mzRtTo-fromRT)/(toRT-fromRT)*cwidth)+marginH;
                g.fillRect(x1,
                           marginV+(colorIndex*5),
                           x2-x1,
                           4);
            }
            colorIndex++;
        }
        
        /* Draw the legend listing m/z values of the different peptide species
         * represented in the chromatogram. Drwan last so it is over top of any
         * chromatogram lines */
        colorIndex = 0;
        var baseX = pwidth-marginH-120;
        var baseY = marginV+5;
        for(var j=0;j<ms1s.length;j++) {
            var ms1 = ms1s[j];
            g.strokeStyle=this.getColor(colorIndex);

            g.beginPath();
            g.moveTo(baseX,baseY+(colorIndex*10)+5);
            g.lineTo(baseX+10,baseY+(colorIndex*10)+5);
            g.stroke();
            if(record.species[ms1.key()].labeling) {
                g.ellipse(baseX+5, baseY+(colorIndex*10)+5, 4, 4, 0, 0, 2*Math.PI);
                g.stroke();
            }

            g.fillStyle="#000000";
            var legendStr = "("+record.species[ms1.key()].z+") "+ms1.key();
            if(record.species[ms1.key()].massOffset === 0)
                g.fillText(legendStr,baseX+15,baseY+(colorIndex*10)+10);
            else
                g.fillText(legendStr+" + "+record.species[ms1.key()].massOffset,baseX+15,baseY+(colorIndex*10)+10);
            
            colorIndex++;
        }
            
    },
    "keyPressEvent" : function(e) {
        
        var diff = 0;
        if(e.key.indexOf("Up") !== -1)
            diff = -1;
        else if(e.key.indexOf("Down") !== -1)
            diff = 1;
        else if(e.key.indexOf("Left") !== -1)
            diff = -2;
        else if(e.key.indexOf("Right") !== -1)
            diff = 2;
        
        if(diff === -1 && this.lastClicked > 0)
            this.render(this.lastClicked-1,this.peptideAreas[this.lastClicked-1]);
        if(diff === 1 && this.lastClicked < this.peptideAreas.length-1) {
            this.render(this.lastClicked+1,this.peptideAreas[this.lastClicked+1]);
        }
        if(diff === -2)
            this.render2(this.ms2Index-1,this.peptideAreas[this.lastClicked]);
        if(diff === 2)
            this.render2(this.ms2Index+1,this.peptideAreas[this.lastClicked]);
        
    }
  }
});
