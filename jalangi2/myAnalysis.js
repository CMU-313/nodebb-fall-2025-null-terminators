(function (sandbox) {
    function MyAnalysis() {
        this.read = function (iid, name, val, isGlobal, isScriptLocal) {
            console.log("Read:", name, "=", val);
        };
    }
    sandbox.analysis = new MyAnalysis();
}(J$));