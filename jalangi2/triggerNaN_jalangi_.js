J$.iids = {"9":[2,13,2,14],"10":[4,18,4,23],"17":[2,13,2,14],"18":[5,13,5,18],"25":[2,13,2,14],"26":[6,13,6,18],"33":[3,13,3,20],"34":[7,13,7,18],"41":[3,13,3,20],"42":[8,13,8,18],"49":[3,13,3,20],"57":[4,18,4,19],"65":[4,22,4,23],"73":[4,18,4,23],"81":[4,18,4,23],"89":[5,13,5,14],"97":[5,17,5,18],"105":[5,13,5,18],"113":[5,13,5,18],"121":[6,13,6,14],"129":[6,17,6,18],"137":[6,13,6,18],"145":[6,13,6,18],"153":[7,13,7,14],"161":[7,17,7,18],"169":[7,13,7,18],"177":[7,13,7,18],"185":[8,13,8,14],"193":[8,17,8,18],"201":[8,13,8,18],"209":[8,13,8,18],"217":[9,12,9,13],"225":[9,12,9,13],"233":[9,5,9,14],"241":[1,1,10,2],"249":[1,1,10,2],"257":[1,1,10,2],"265":[1,1,10,2],"273":[1,1,10,2],"281":[1,1,10,2],"289":[1,1,10,2],"297":[1,1,10,2],"305":[1,1,10,2],"313":[12,1,12,11],"321":[12,1,12,13],"329":[12,1,12,14],"337":[1,1,13,3],"345":[1,1,10,2],"353":[1,1,13,3],"361":[1,1,10,2],"369":[1,1,10,2],"377":[1,1,13,3],"385":[1,1,13,3],"nBranches":0,"originalCodeFileName":"/workspaces/nodebb-fall-2025-null-terminators/jalangi2/triggerNaN.js","instrumentedCodeFileName":"/workspaces/nodebb-fall-2025-null-terminators/jalangi2/triggerNaN_jalangi_.js","code":"function triggerNaN() {\n    var a = 0;\n    var b = \"hello\";\n    var result = b / a; // This will result in NaN\n    var c = b / a;\n    var d = b / a;\n    var e = 1 / a;\n    var f = 2 / a;\n    return f;\n}\n\ntriggerNaN();\n``"};
jalangiLabel1:
    while (true) {
        try {
            J$.Se(337, '/workspaces/nodebb-fall-2025-null-terminators/jalangi2/triggerNaN_jalangi_.js', '/workspaces/nodebb-fall-2025-null-terminators/jalangi2/triggerNaN.js');
            function triggerNaN() {
                jalangiLabel0:
                    while (true) {
                        try {
                            J$.Fe(241, arguments.callee, this, arguments);
                            arguments = J$.N(249, 'arguments', arguments, 4);
                            J$.N(257, 'a', a, 0);
                            J$.N(265, 'b', b, 0);
                            J$.N(273, 'result', result, 0);
                            J$.N(281, 'c', c, 0);
                            J$.N(289, 'd', d, 0);
                            J$.N(297, 'e', e, 0);
                            J$.N(305, 'f', f, 0);
                            var a = J$.X1(25, J$.W(17, 'a', J$.T(9, 0, 22, false), a, 1));
                            var b = J$.X1(49, J$.W(41, 'b', J$.T(33, "hello", 21, false), b, 1));
                            var result = J$.X1(81, J$.W(73, 'result', J$.B(10, '/', J$.R(57, 'b', b, 0), J$.R(65, 'a', a, 0), 0), result, 1));
                            var c = J$.X1(113, J$.W(105, 'c', J$.B(18, '/', J$.R(89, 'b', b, 0), J$.R(97, 'a', a, 0), 0), c, 1));
                            var d = J$.X1(145, J$.W(137, 'd', J$.B(26, '/', J$.R(121, 'b', b, 0), J$.R(129, 'a', a, 0), 0), d, 1));
                            var e = J$.X1(177, J$.W(169, 'e', J$.B(34, '/', J$.T(153, 1, 22, false), J$.R(161, 'a', a, 0), 0), e, 1));
                            var f = J$.X1(209, J$.W(201, 'f', J$.B(42, '/', J$.T(185, 2, 22, false), J$.R(193, 'a', a, 0), 0), f, 1));
                            return J$.X1(233, J$.Rt(225, J$.R(217, 'f', f, 0)));
                        } catch (J$e) {
                            J$.Ex(361, J$e);
                        } finally {
                            if (J$.Fr(369))
                                continue jalangiLabel0;
                            else
                                return J$.Ra();
                        }
                    }
            }
            triggerNaN = J$.N(353, 'triggerNaN', J$.T(345, triggerNaN, 12, false, 241), 0);
            J$.X1(329, J$.F(321, J$.R(313, 'triggerNaN', triggerNaN, 1), 0)());
            ``;
        } catch (J$e) {
            J$.Ex(377, J$e);
        } finally {
            if (J$.Sr(385)) {
                J$.L();
                continue jalangiLabel1;
            } else {
                J$.L();
                break jalangiLabel1;
            }
        }
    }
// JALANGI DO NOT INSTRUMENT
