var MS1Chromatogram = function(obj) {
    var retentionTimes = obj["rt"];
    var intensities = obj["int"];
    var key = obj["key"];
    var maxInt = obj["maxInt"];
    var isLabeling=obj["labeling"];
    var massOffset=obj["massOffset"];
    var chargeState=obj["z"];
    
    this.maxIntensity = function() {
        return maxInt;
    };
    
    this.size = function() {
        return retentionTimes.length;
    };
    
    this.RT = function(i) {
        return retentionTimes[i];
    };
    
    this.Intensity = function(i) {
        return intensities[i];
    };
    
    this.key = function() {
        return key;
    };
    
    this.isLabeling = function() {
        return isLabeling;
    };
    
    this.massOffset = function() {
        return massOffset;
    };
    
    this.chargeState = function() {
        return chargeState;
    };

    this.compareTo = function(o,record) {
        var f1 = record.species[this.key()].z - record.species[o.key()].z;
        var f2 = record.species[this.key()].labeling - record.species[o.key()].labeling;
        var f3 = record.species[this.key()].massOffset - record.species[o.key()].massOffset;
        if(f1 !== 0) return f1;
        else if(f2 !== 0) return f2;
        else return f3;
    };
};

