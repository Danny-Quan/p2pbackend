const mongoose= require('mongoose');

const userSchema=new mongoose.Schema({
    username:{
        type:String,
        require:true,
        trim:true,
        unique:true
    },
    password:{
        type: String,
        require:true,
        minLength: [6, "password must be greater than 5 character"],
    },
    photo:{
        type: String,
        require: true,
        default:"https://picsum.photos/id/237/200/300"
    }
}, {
    timestamps:true
}
)

const User= mongoose.model('user', userSchema);

module.exports= User;