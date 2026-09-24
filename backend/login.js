const users = require("./users");

function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Vui lòng nhập email và mật khẩu"
        });
    }

    const user = users.find(
        user =>
            user.email.toLowerCase() === email.toLowerCase() &&
            user.password === password
    );

    if (!user) {
        return res.status(401).json({
            message: "Email hoặc mật khẩu không đúng"
        });
    }

    res.status(200).json({
        message: "Đăng nhập thành công",
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone
        }
    });
}

module.exports = login;