const pants = "1";

const isNum = !isNaN(parseInt(pants, 10)) && parseFloat(pants) % 1 === 0;

console.log(isNum);
