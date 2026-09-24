const users = require("./users");

function register(req, res) {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
        return res.status(400).json({
            message: "Vui lòng nhập đầy đủ thông tin"
        });
    }

    const emailExists = users.some(
        user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
        return res.status(400).json({
            message: "Email này đã được đăng ký"
        });
    }

    const newUser = {
        id: Date.now(),
        name: name,
        email: email,
        phone: phone,
        password: password
    };

    users.push(newUser);

    res.status(201).json({
        message: "Đăng ký thành công",
        user: newUser
    });
}

module.exports = register;