import assert from "node:assert/strict";
import * as S from "../src/lib/scene";
import { packProject, unpackProject } from "../src/lib/projectFile";
let m = S.newMovie("পরীক্ষা"); const r = S.addObject(m, m.scenes[0].id, "n_girl"); m = r.movie;
m = S.updateScene(m, m.scenes[0].id, (s) => S.addDialogue(s, r.objId, 1, "নমস্কার"));
const back = unpackProject(packProject(m));
assert.deepEqual(back, JSON.parse(JSON.stringify(m)), "রাউন্ড-ট্রিপে প্রজেক্ট অক্ষত");
assert.throws(() => unpackProject("{}"));
console.log("✅ প্রজেক্ট এক্সপোর্ট/ইমপোর্ট ফরম্যাট পাস");
