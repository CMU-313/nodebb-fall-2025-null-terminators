function triggerNaN() {
    var a = 0;
    var b = "hello";
    var result = b / a; // This will result in NaN
    var c = b / a;
    var d = b / a;
}

triggerNaN();
triggerNaN();
``