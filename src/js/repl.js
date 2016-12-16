

var input = "",
    output = "";
while(input = prompt(output)){
  try{
    output = eval(input);
  }catch(err){
    output = err;
  }
}