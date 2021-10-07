
const PEParser = require('./PEParser');


const parser = new PEParser();

const start = async () => {


	const exeFile = `${__dirname}/../exe/CrackMe.exe`;

    await parser.loadFile(exeFile);

    // let result = parser.findStrings('pass');
    // console.log(result)

    console.log(parser.getHeaders());
    console.log(parser.getSections());

}
start();

