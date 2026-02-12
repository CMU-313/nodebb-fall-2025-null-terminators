function triggerNaN() {
    var a = 0;
    var b = "hello";
    var result = b / a; // This will result in NaN
    var c = b / a;
    var d = b / a;
    var e = 1 / a;
    var f = 2 / a;
    return f;
}

triggerNaN();
``