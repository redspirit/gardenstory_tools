const fs = require('fs');

class PEParser {
    constructor() {
        this.buffer = null;
        this.strings = [];
    }

    intToHex (int) {
        return int.toString(16);
    }

    hexToInt(hex) {
        return parseInt(hex, 16);
    }

    loadFile (filename) {
        return new Promise((resolve, reject) => {
            fs.readFile(filename, (err, buf) => {
                if(err) return reject(err);
                this.buffer = buf;

                console.log(buf);

                let groups = [];
                let string = '';
                let addr = 0;

                for (const char of buf) {
                    if(char >= 32 && char <= 126) {
                        string += String.fromCharCode(char)
                    } else if(string.length > 0) {
                        if(string.length > 2) groups.push([addr.toString(16), string]);
                        string = '';
                    }
                    addr++;
                }

                this.strings = groups;

                resolve(buf);
            });

        })
    }

    getString(address, length) {
        let sbuf = this.buffer.slice(address, address + length);
        let str = '';
        for (const char of sbuf) {
            str += String.fromCharCode(char)
        }
        return str;
    }

    findStrings(name) {

        return this.strings.filter(item => {
            return new RegExp(name, "i").test(item[1]);
        }).map(item => {
            return {address: item[0], data: item[1]}
        });

    }

    getHeaders () {

        let buf = this.buffer;

        let peHeaderAddress = buf.readUInt32LE(this.hexToInt('3C'));

        return {
            e_magic: String.fromCharCode(buf.readInt8(0)) + String.fromCharCode(buf.readInt8(1)),
            e_lfanew: this.intToHex(peHeaderAddress),
            Signature: this.getString(peHeaderAddress, 4),
            Machine: this.intToHex(buf.readUInt16LE(peHeaderAddress + 4)),
            NumberOfSections: buf.readUInt16LE(peHeaderAddress + 6),
            SizeOfOptionalHeader: this.intToHex(buf.readUInt16LE(peHeaderAddress + 20)),
            Characteristics: this.intToHex(buf.readUInt16LE(peHeaderAddress + 22)),

            Magic: this.intToHex(buf.readUInt16LE(peHeaderAddress + 24)),
            AddressOfEntryPoint: this.intToHex(buf.readUInt32LE(peHeaderAddress + 24 + 16)),
            ImageBase: this.intToHex(buf.readUInt32LE(peHeaderAddress + 24 + 16 + 12)),
            SectionAlignment: this.intToHex(buf.readUInt32LE(peHeaderAddress + 24 + 16 + 12 + 4)),
            FileAlignment: this.intToHex(buf.readUInt32LE(peHeaderAddress + 24 + 16 + 12 + 8)),
            SizeOfImage: this.intToHex(buf.readUInt32LE(peHeaderAddress + 24 + 16 + 12 + 8 + 20)),
            SizeOfHeaders: this.intToHex(buf.readUInt32LE(peHeaderAddress + 24 + 16 + 12 + 8 + 24)),
            Subsystem: this.intToHex(buf.readUInt16LE(peHeaderAddress + 24 + 16 + 12 + 8 + 24 + 8)),
            NumberOfRvaAndSizes: this.intToHex(buf.readUInt32LE(peHeaderAddress + 24 + 16 + 12 + 8 + 24 + 8 + 24)),
        }


    }

    getSections () {


    }

}

module.exports = PEParser;
