"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateChatioDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_chatio_dto_1 = require("./create-chatio.dto");
class UpdateChatioDto extends (0, mapped_types_1.PartialType)(create_chatio_dto_1.CreateChatioDto) {
    id;
}
exports.UpdateChatioDto = UpdateChatioDto;
//# sourceMappingURL=update-chatio.dto.js.map