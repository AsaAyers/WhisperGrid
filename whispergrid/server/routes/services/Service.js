"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Service = void 0;
class Service {
    static rejectResponse(error, code = 500) {
        return { error, code };
    }
    static rejectError(error, code = 500) {
        if ("code" in error) {
            return error;
        }
        return Service.rejectResponse(error.message || "Invalid input", error.status || code);
    }
    static successResponse(payload, code = 200) {
        return { payload, code };
    }
}
exports.Service = Service;
