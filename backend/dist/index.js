"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const http_1 = __importDefault(require("http"));
const constants_1 = require("./config/constants");
const auth_1 = require("./middleware/auth");
const auth_2 = __importDefault(require("./routes/auth"));
const cron_1 = __importDefault(require("./routes/cron"));
const files_1 = __importDefault(require("./routes/files"));
const user_1 = __importDefault(require("./routes/user"));
const app = (0, express_1.default)();
dotenv_1.default.config();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const ALLOWED_ORIGINS = [constants_1.CLIENT_URL, constants_1.TAURI_URL, constants_1.TAURI_URL_DEV];
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 3000;
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'your_very_secure_secret_key',
    resave: false,
    saveUninitialized: false,
}));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
            callback(null, true);
        }
        else {
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.get('/', async (req, res) => {
    res.json({
        status: 'ok',
        message: 'Yeeet api is running',
        uptime: process.uptime(),
    });
});
// Routes
app.use(`${constants_1.API_PREFIX}`, auth_2.default);
app.use(`${constants_1.API_PREFIX}`, cron_1.default);
app.use(`${constants_1.API_PREFIX}`, user_1.default);
app.use(`${constants_1.API_PREFIX}`, files_1.default);
app.use(auth_1.requireAuth, express_1.default.static('public'));
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map