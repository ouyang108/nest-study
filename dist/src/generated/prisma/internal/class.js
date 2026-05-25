"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrismaClientClass = getPrismaClientClass;
const runtime = __importStar(require("@prisma/client/runtime/client"));
const config = {
    "previewFeatures": [],
    "clientVersion": "7.8.0",
    "engineVersion": "3c6e192761c0362d496ed980de936e2f3cebcd3a",
    "activeProvider": "postgresql",
    "inlineSchema": "// This is your Prisma schema file,\n// learn more about it in the docs: https://pris.ly/d/prisma-schema\n\n// Get a free hosted Postgres database in seconds: `npx create-db`\n\ngenerator client {\n  provider     = \"prisma-client\"\n  output       = \"../src/generated/prisma\"\n  moduleFormat = \"cjs\" // 模块格式\n}\n\ndatasource db {\n  provider = \"postgresql\"\n}\n\nmodel User {\n  id    Int     @id @default(autoincrement())\n  email String  @unique\n  name  String?\n  age   Int?\n  posts Post[]\n}\n\nmodel Post {\n  id        Int      @id @default(autoincrement())\n  title     String\n  content   String?\n  published Boolean? @default(false)\n  author    User?    @relation(fields: [authorId], references: [id])\n  authorId  Int?\n}\n",
    "runtimeDataModel": {
        "models": {},
        "enums": {},
        "types": {}
    },
    "parameterizationSchema": {
        "strings": [],
        "graph": ""
    }
};
config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"age\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"posts\",\"kind\":\"object\",\"type\":\"Post\",\"relationName\":\"PostToUser\"}],\"dbName\":null},\"Post\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"published\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"author\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"PostToUser\"},{\"name\":\"authorId\",\"kind\":\"scalar\",\"type\":\"Int\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}");
config.parameterizationSchema = {
    strings: JSON.parse("[\"where\",\"orderBy\",\"cursor\",\"author\",\"posts\",\"_count\",\"User.findUnique\",\"User.findUniqueOrThrow\",\"User.findFirst\",\"User.findFirstOrThrow\",\"User.findMany\",\"data\",\"User.createOne\",\"User.createMany\",\"User.createManyAndReturn\",\"User.updateOne\",\"User.updateMany\",\"User.updateManyAndReturn\",\"create\",\"update\",\"User.upsertOne\",\"User.deleteOne\",\"User.deleteMany\",\"having\",\"_avg\",\"_sum\",\"_min\",\"_max\",\"User.groupBy\",\"User.aggregate\",\"Post.findUnique\",\"Post.findUniqueOrThrow\",\"Post.findFirst\",\"Post.findFirstOrThrow\",\"Post.findMany\",\"Post.createOne\",\"Post.createMany\",\"Post.createManyAndReturn\",\"Post.updateOne\",\"Post.updateMany\",\"Post.updateManyAndReturn\",\"Post.upsertOne\",\"Post.deleteOne\",\"Post.deleteMany\",\"Post.groupBy\",\"Post.aggregate\",\"AND\",\"OR\",\"NOT\",\"id\",\"title\",\"content\",\"published\",\"authorId\",\"equals\",\"in\",\"notIn\",\"lt\",\"lte\",\"gt\",\"gte\",\"not\",\"contains\",\"startsWith\",\"endsWith\",\"email\",\"name\",\"age\",\"every\",\"some\",\"none\",\"is\",\"isNot\",\"connectOrCreate\",\"upsert\",\"createMany\",\"set\",\"disconnect\",\"delete\",\"connect\",\"updateMany\",\"deleteMany\",\"increment\",\"decrement\",\"multiply\",\"divide\"]"),
    graph: "exYgCAQAAFAAIC4AAEsAMC8AAAcAEDAAAEsAMDECAAAAAUEBAAAAAUIBAE4AIUMCAE8AIQEAAAABACAJAwAAUwAgLgAAUQAwLwAAAwAQMAAAUQAwMQIATAAhMgEATQAhMwEATgAhNCAAUgAhNQIATwAhBAMAAHUAIDMAAFQAIDQAAFQAIDUAAFQAIAkDAABTACAuAABRADAvAAADABAwAABRADAxAgAAAAEyAQBNACEzAQBOACE0IABSACE1AgBPACEDAAAAAwAgAQAABAAwAgAABQAgCAQAAFAAIC4AAEsAMC8AAAcAEDAAAEsAMDECAEwAIUEBAE0AIUIBAE4AIUMCAE8AIQEAAAAHACABAAAAAwAgAQAAAAEAIAMEAAB0ACBCAABUACBDAABUACADAAAABwAgAQAACwAwAgAAAQAgAwAAAAcAIAEAAAsAMAIAAAEAIAMAAAAHACABAAALADACAAABACAFBAAAcwAgMQIAAAABQQEAAAABQgEAAAABQwIAAAABAQsAAA8AIAQxAgAAAAFBAQAAAAFCAQAAAAFDAgAAAAEBCwAAEQAwAQsAABEAMAUEAABmACAxAgBdACFBAQBaACFCAQBbACFDAgBeACECAAAAAQAgCwAAFAAgBDECAF0AIUEBAFoAIUIBAFsAIUMCAF4AIQIAAAAHACALAAAWACACAAAABwAgCwAAFgAgAwAAAAEAIBIAAA8AIBMAABQAIAEAAAABACABAAAABwAgBwUAAGEAIBgAAGIAIBkAAGUAIBoAAGQAIBsAAGMAIEIAAFQAIEMAAFQAIAcuAABKADAvAAAdABAwAABKADAxAgA5ACFBAQA6ACFCAQA7ACFDAgA9ACEDAAAABwAgAQAAHAAwFwAAHQAgAwAAAAcAIAEAAAsAMAIAAAEAIAEAAAAFACABAAAABQAgAwAAAAMAIAEAAAQAMAIAAAUAIAMAAAADACABAAAEADACAAAFACADAAAAAwAgAQAABAAwAgAABQAgBgMAAGAAIDECAAAAATIBAAAAATMBAAAAATQgAAAAATUCAAAAAQELAAAlACAFMQIAAAABMgEAAAABMwEAAAABNCAAAAABNQIAAAABAQsAACcAMAELAAAnADABAAAABwAgBgMAAF8AIDECAF0AITIBAFoAITMBAFsAITQgAFwAITUCAF4AIQIAAAAFACALAAArACAFMQIAXQAhMgEAWgAhMwEAWwAhNCAAXAAhNQIAXgAhAgAAAAMAIAsAAC0AIAIAAAADACALAAAtACABAAAABwAgAwAAAAUAIBIAACUAIBMAACsAIAEAAAAFACABAAAAAwAgCAUAAFUAIBgAAFYAIBkAAFkAIBoAAFgAIBsAAFcAIDMAAFQAIDQAAFQAIDUAAFQAIAguAAA4ADAvAAA1ABAwAAA4ADAxAgA5ACEyAQA6ACEzAQA7ACE0IAA8ACE1AgA9ACEDAAAAAwAgAQAANAAwFwAANQAgAwAAAAMAIAEAAAQAMAIAAAUAIAguAAA4ADAvAAA1ABAwAAA4ADAxAgA5ACEyAQA6ACEzAQA7ACE0IAA8ACE1AgA9ACENBQAARgAgGAAASQAgGQAARgAgGgAARgAgGwAARgAgNgIAAAABNwIAAAAEOAIAAAAEOQIAAAABOgIAAAABOwIAAAABPAIAAAABPQIASAAhDgUAAEYAIBoAAEcAIBsAAEcAIDYBAAAAATcBAAAABDgBAAAABDkBAAAAAToBAAAAATsBAAAAATwBAAAAAT0BAEUAIT4BAAAAAT8BAAAAAUABAAAAAQ4FAAA_ACAaAABEACAbAABEACA2AQAAAAE3AQAAAAU4AQAAAAU5AQAAAAE6AQAAAAE7AQAAAAE8AQAAAAE9AQBDACE-AQAAAAE_AQAAAAFAAQAAAAEFBQAAPwAgGgAAQgAgGwAAQgAgNiAAAAABPSAAQQAhDQUAAD8AIBgAAEAAIBkAAD8AIBoAAD8AIBsAAD8AIDYCAAAAATcCAAAABTgCAAAABTkCAAAAAToCAAAAATsCAAAAATwCAAAAAT0CAD4AIQ0FAAA_ACAYAABAACAZAAA_ACAaAAA_ACAbAAA_ACA2AgAAAAE3AgAAAAU4AgAAAAU5AgAAAAE6AgAAAAE7AgAAAAE8AgAAAAE9AgA-ACEINgIAAAABNwIAAAAFOAIAAAAFOQIAAAABOgIAAAABOwIAAAABPAIAAAABPQIAPwAhCDYIAAAAATcIAAAABTgIAAAABTkIAAAAAToIAAAAATsIAAAAATwIAAAAAT0IAEAAIQUFAAA_ACAaAABCACAbAABCACA2IAAAAAE9IABBACECNiAAAAABPSAAQgAhDgUAAD8AIBoAAEQAIBsAAEQAIDYBAAAAATcBAAAABTgBAAAABTkBAAAAAToBAAAAATsBAAAAATwBAAAAAT0BAEMAIT4BAAAAAT8BAAAAAUABAAAAAQs2AQAAAAE3AQAAAAU4AQAAAAU5AQAAAAE6AQAAAAE7AQAAAAE8AQAAAAE9AQBEACE-AQAAAAE_AQAAAAFAAQAAAAEOBQAARgAgGgAARwAgGwAARwAgNgEAAAABNwEAAAAEOAEAAAAEOQEAAAABOgEAAAABOwEAAAABPAEAAAABPQEARQAhPgEAAAABPwEAAAABQAEAAAABCDYCAAAAATcCAAAABDgCAAAABDkCAAAAAToCAAAAATsCAAAAATwCAAAAAT0CAEYAIQs2AQAAAAE3AQAAAAQ4AQAAAAQ5AQAAAAE6AQAAAAE7AQAAAAE8AQAAAAE9AQBHACE-AQAAAAE_AQAAAAFAAQAAAAENBQAARgAgGAAASQAgGQAARgAgGgAARgAgGwAARgAgNgIAAAABNwIAAAAEOAIAAAAEOQIAAAABOgIAAAABOwIAAAABPAIAAAABPQIASAAhCDYIAAAAATcIAAAABDgIAAAABDkIAAAAAToIAAAAATsIAAAAATwIAAAAAT0IAEkAIQcuAABKADAvAAAdABAwAABKADAxAgA5ACFBAQA6ACFCAQA7ACFDAgA9ACEIBAAAUAAgLgAASwAwLwAABwAQMAAASwAwMQIATAAhQQEATQAhQgEATgAhQwIATwAhCDYCAAAAATcCAAAABDgCAAAABDkCAAAAAToCAAAAATsCAAAAATwCAAAAAT0CAEYAIQs2AQAAAAE3AQAAAAQ4AQAAAAQ5AQAAAAE6AQAAAAE7AQAAAAE8AQAAAAE9AQBHACE-AQAAAAE_AQAAAAFAAQAAAAELNgEAAAABNwEAAAAFOAEAAAAFOQEAAAABOgEAAAABOwEAAAABPAEAAAABPQEARAAhPgEAAAABPwEAAAABQAEAAAABCDYCAAAAATcCAAAABTgCAAAABTkCAAAAAToCAAAAATsCAAAAATwCAAAAAT0CAD8AIQNEAAADACBFAAADACBGAAADACAJAwAAUwAgLgAAUQAwLwAAAwAQMAAAUQAwMQIATAAhMgEATQAhMwEATgAhNCAAUgAhNQIATwAhAjYgAAAAAT0gAEIAIQoEAABQACAuAABLADAvAAAHABAwAABLADAxAgBMACFBAQBNACFCAQBOACFDAgBPACFHAAAHACBIAAAHACAAAAAAAAABTAEAAAABAUwBAAAAAQFMIAAAAAEFTAIAAAABUgIAAAABUwIAAAABVAIAAAABVQIAAAABBUwCAAAAAVICAAAAAVMCAAAAAVQCAAAAAVUCAAAAAQcSAAB3ACATAAB6ACBJAAB4ACBKAAB5ACBNAAAHACBOAAAHACBPAAABACADEgAAdwAgSQAAeAAgTwAAAQAgAAAAAAALEgAAZwAwEwAAbAAwSQAAaAAwSgAAaQAwSwAAagAgTAAAawAwTQAAawAwTgAAawAwTwAAawAwUAAAbQAwUQAAbgAwBDECAAAAATIBAAAAATMBAAAAATQgAAAAAQIAAAAFACASAAByACADAAAABQAgEgAAcgAgEwAAcQAgAQsAAHYAMAkDAABTACAuAABRADAvAAADABAwAABRADAxAgAAAAEyAQBNACEzAQBOACE0IABSACE1AgBPACECAAAABQAgCwAAcQAgAgAAAG8AIAsAAHAAIAguAABuADAvAABvABAwAABuADAxAgBMACEyAQBNACEzAQBOACE0IABSACE1AgBPACEILgAAbgAwLwAAbwAQMAAAbgAwMQIATAAhMgEATQAhMwEATgAhNCAAUgAhNQIATwAhBDECAF0AITIBAFoAITMBAFsAITQgAFwAIQQxAgBdACEyAQBaACEzAQBbACE0IABcACEEMQIAAAABMgEAAAABMwEAAAABNCAAAAABBBIAAGcAMEkAAGgAMEsAAGoAIE8AAGsAMAADBAAAdAAgQgAAVAAgQwAAVAAgBDECAAAAATIBAAAAATMBAAAAATQgAAAAAQQxAgAAAAFBAQAAAAFCAQAAAAFDAgAAAAECAAAAAQAgEgAAdwAgAwAAAAcAIBIAAHcAIBMAAHsAIAYAAAAHACALAAB7ACAxAgBdACFBAQBaACFCAQBbACFDAgBeACEEMQIAXQAhQQEAWgAhQgEAWwAhQwIAXgAhAgQGAgUAAwEDCAEBBAkAAAAABQUACBgACRkAChoACxsADAAAAAAABQUACBgACRkAChoACxsADAEDKgEBAzABBQUAERgAEhkAExoAFBsAFQAAAAAABQUAERgAEhkAExoAFBsAFQYCAQcKAQgMAQkNAQoOAQwQAQ0SBA4TBQ8VARAXBBEYBhQZARUaARYbBBweBx0fDR4gAh8hAiAiAiEjAiIkAiMmAiQoBCUpDiYsAicuBCgvDykxAioyAiszBCw2EC03Fg"
};
async function decodeBase64AsWasm(wasmBase64) {
    const { Buffer } = await import('node:buffer');
    const wasmArray = Buffer.from(wasmBase64, 'base64');
    return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
    getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.js"),
    getQueryCompilerWasmModule: async () => {
        const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.js");
        return await decodeBase64AsWasm(wasm);
    },
    importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
    return runtime.getPrismaClient(config);
}
//# sourceMappingURL=class.js.map