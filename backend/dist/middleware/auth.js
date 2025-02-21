"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const session_1 = require("../session");
const requireAuth = async (req, res, next) => {
    const token = (0, session_1.getTokenFromRequest)(req);
    if (token) {
        const { user } = await (0, session_1.validateSessionToken)(token);
        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
    }
    else {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    next();
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.js.map