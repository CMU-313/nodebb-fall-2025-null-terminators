J$.iids = {"9":[2,13,2,14],"10":[4,18,4,23],"17":[2,13,2,14],"18":[5,13,5,18],"25":[2,13,2,14],"26":[6,13,6,18],"33":[3,13,3,20],"41":[3,13,3,20],"49":[3,13,3,20],"57":[4,18,4,19],"65":[4,22,4,23],"73":[4,18,4,23],"81":[4,18,4,23],"89":[5,13,5,14],"97":[5,17,5,18],"105":[5,13,5,18],"113":[5,13,5,18],"121":[6,13,6,14],"129":[6,17,6,18],"137":[6,13,6,18],"145":[6,13,6,18],"153":[1,1,7,2],"161":[1,1,7,2],"169":[1,1,7,2],"177":[1,1,7,2],"185":[1,1,7,2],"193":[1,1,7,2],"201":[1,1,7,2],"209":[9,1,9,11],"217":[9,1,9,13],"225":[9,1,9,14],"233":[10,1,10,11],"241":[10,1,10,13],"249":[10,1,10,14],"257":[1,1,11,3],"265":[1,1,7,2],"273":[1,1,11,3],"281":[1,1,7,2],"289":[1,1,7,2],"297":[1,1,11,3],"305":[1,1,11,3],"nBranches":0,"originalCodeFileName":"/workspaces/nodebb-fall-2025-null-terminators/jalangi2/triggerNaN.js","instrumentedCodeFileName":"/workspaces/nodebb-fall-2025-null-terminators/jalangi2/triggerNaN_jalangi_.js","code":"function triggerNaN() {\n    var a = 0;\n    var b = \"hello\";\n    var result = b / a; // This will result in NaN\n    var c = b / a;\n    var d = b / a;\n}\n\ntriggerNaN();\ntriggerNaN();\n``"};
jalangiLabel1:
    while (true) {
        try {
            J$.Se(257, '/workspaces/nodebb-fall-2025-null-terminators/jalangi2/triggerNaN_jalangi_.js', '/workspaces/nodebb-fall-2025-null-terminators/jalangi2/triggerNaN.js');
            function triggerNaN() {
                jalangiLabel0:
                    while (true) {
                        try {
                            J$.Fe(153, arguments.callee, this, arguments);
                            arguments = J$.N(161, 'arguments', arguments, 4);
                            J$.N(169, 'a', a, 0);
                            J$.N(177, 'b', b, 0);
                            J$.N(185, 'result', result, 0);
                            J$.N(193, 'c', c, 0);
                            J$.N(201, 'd', d, 0);
                            var a = J$.X1(25, J$.W(17, 'a', J$.T(9, 0, 22, false), a, 1));
                            var b = J$.X1(49, J$.W(41, 'b', J$.T(33, "hello", 21, false), b, 1));
                            var result = J$.X1(81, J$.W(73, 'result', J$.B(10, '/', J$.R(57, 'b', b, 0), J$.R(65, 'a', a, 0), 0), result, 1));
                            var c = J$.X1(113, J$.W(105, 'c', J$.B(18, '/', J$.R(89, 'b', b, 0), J$.R(97, 'a', a, 0), 0), c, 1));
                            var d = J$.X1(145, J$.W(137, 'd', J$.B(26, '/', J$.R(121, 'b', b, 0), J$.R(129, 'a', a, 0), 0), d, 1));
                        } catch (J$e) {
                            J$.Ex(281, J$e);
                        } finally {
                            if (J$.Fr(289))
                                continue jalangiLabel0;
                            else
                                return J$.Ra();
                        }
                    }
            }
            triggerNaN = J$.N(273, 'triggerNaN', J$.T(265, triggerNaN, 12, false, 153), 0);
            J$.X1(225, J$.F(217, J$.R(209, 'triggerNaN', triggerNaN, 1), 0)());
            J$.X1(249, J$.F(241, J$.R(233, 'triggerNaN', triggerNaN, 1), 0)());
            ``;
        } catch (J$e) {
            J$.Ex(297, J$e);
        } finally {
            if (J$.Sr(305)) {
                J$.L();
                continue jalangiLabel1;
            } else {
                J$.L();
                break jalangiLabel1;
            }
        }
    }
// JALANGI DO NOT INSTRUMENT
