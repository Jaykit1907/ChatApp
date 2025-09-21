// import jwt from "jsonwebtoken";

// const generateTokenAndSetCookie= (userId, res) => {
    
       
   
 
//     const token= jwt.sign({userId}, process.env.JWT_SECRET, {

//         expiresIn:'15d'
//     })
//     console.log("its");
//     res.cookie("jwt",token,{
//         maxAge:15*24*60*60*1000,
//         httpOnly:true,
//         sameSite:"strict",
//         secure: process.env.NODE_ENV !== "development"
//     });
// };

// export default generateTokenAndSetCookie;
import jwt from "jsonwebtoken";

const generateTokenAndSetCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });
  
 res.cookie("token", token, {
      maxAge: 5*24* 60 * 60 * 1000,
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      // sameSite: "strict",
      sameSite: "none", 
secure: true // must be true if sameSite is "none"

    });
};

export default generateTokenAndSetCookie;
