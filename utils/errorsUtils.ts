module.exports.signUpErrors = (err : any) => {
    let errors = { email: '', password: ''}

   
    if (err.message.includes('email'))
       errors.email = 'Email already in use.';
   
    if (err.message.includes('password'))
       errors.password = "Password needs to be at least 8"
   
   if (err.code === 11000 && Object.keys(err.keyValue)[0].includes('email'))
       errors.email = 'Email alr registered'

    return errors;
};
   
module.exports.signInErrors = (err : any) => {
       let errors = {email: '', password: '', verify: ''};
       if (err.message.includes('verify'))
           errors.verify = "Please Verify your Account first";

       if (err.message.includes('email'))
           errors.email = "E-mail Unknown. Create an account first";
   
       if (err.message.includes('password'))
           errors.password = "Password does not match";
       return errors
}