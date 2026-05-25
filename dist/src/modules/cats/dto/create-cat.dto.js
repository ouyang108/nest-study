"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCatDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CreateCatDto {
    name;
    breed;
    age;
}
exports.CreateCatDto = CreateCatDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '猫咪名字不能为空' }),
    (0, class_validator_1.IsString)({ message: '猫咪名字必须是字符串' }),
    __metadata("design:type", String)
], CreateCatDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '猫咪品种不能为空' }),
    (0, class_validator_1.IsString)({ message: '猫咪品种必须是字符串' }),
    (0, class_transformer_1.Type)(() => String),
    __metadata("design:type", String)
], CreateCatDto.prototype, "breed", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '猫咪年龄不能为空' }),
    (0, class_validator_1.IsNumber)({}, { message: '猫咪年龄必须是数字' }),
    (0, class_validator_1.Min)(0, { message: '猫咪年龄不能小于 0' }),
    (0, class_validator_1.Max)(30, { message: '猫咪年龄不能大于 30' }),
    __metadata("design:type", Number)
], CreateCatDto.prototype, "age", void 0);
//# sourceMappingURL=create-cat.dto.js.map