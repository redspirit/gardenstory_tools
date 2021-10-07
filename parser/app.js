
const PEParser = require('./PEParser');


const parser = new PEParser();

const start = async () => {

    await parser.loadFile('/home/spirit/hard/workspace/gardenstory_tools/exe/CrackMe.exe');

    // let result = parser.findStrings('pass');
    // console.log(result)

    console.log(parser.getHeaders());

}
start();

