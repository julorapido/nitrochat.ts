const nodemailer = require("nodemailer");

const html = (txt : string) =>{ `
    <h1>Hello World ${txt}</h1>
    <p>Please the link below to <strong>verify</strong> your account on Nitrochat</p>
`};
module.exports.sendEmail = async (email : string, subject : string, text : string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      port: 465, // cause its Gmail
      secure: true,  // cause its Gmail too
      auth: {
        user: process.env.USER, // nitrochat mail
        pass: process.env.PASS, // Gmail App passwrd secret
      },
    });
    const info = await transporter.sendMail({
      from: process.env.USER,
      to: email,
      subject: subject,
      text: text
    });
    //console.log(info.accepted); console.log(info.rejected);
    console.log("email sent sucessfully");
  } catch (error) {
    console.log(error);
  }
};
