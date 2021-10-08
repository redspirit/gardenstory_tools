const fs = require('fs');

class PEParser {
    constructor() {
        this.buffer = null;
        this.strings = [];
    }

    intToHex (int) {
        return int.toString(16).toUpperCase();
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

    getString(address, length, subBuffer = null) {
        let sbuf = subBuffer
            ? subBuffer.slice(address, address + length)
            : this.buffer.slice(address, address + length);
        let str = '';
        for (const char of sbuf) {
            if(char >= 32 && char <= 126) str += String.fromCharCode(char)
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

        let peHeaderAddress = buf.readUInt32LE(60);

        return {
            e_magic: buf.toString('utf8', 0, 2),
            e_lfanew: this.intToHex(peHeaderAddress),
            Signature: this.getString(peHeaderAddress, 4),
            Machine: this.intToHex(buf.readUInt16LE(peHeaderAddress + 4)),
            NumberOfSections: buf.readUInt16LE(peHeaderAddress + 6),
            SizeOfOptionalHeader: this.intToHex(buf.readUInt16LE(peHeaderAddress + 20)),
            Characteristics: this.intToHex(buf.readUInt16LE(peHeaderAddress + 22)),
            Magic: this.intToHex(buf.readUInt16LE(peHeaderAddress + 24)),
            AddressOfEntryPoint: this.intToHex(buf.readUInt32LE(peHeaderAddress + 40)),
            ImageBase: this.intToHex(buf.readBigUInt64LE(peHeaderAddress + 48)),
            SectionAlignment: this.intToHex(buf.readUInt32LE(peHeaderAddress + 56)),
            FileAlignment: this.intToHex(buf.readUInt32LE(peHeaderAddress + 60)),
            SizeOfImage: this.intToHex(buf.readUInt32LE(peHeaderAddress + 80)),
            SizeOfHeaders: this.intToHex(buf.readUInt32LE(peHeaderAddress + 84)),
            Subsystem: this.intToHex(buf.readUInt16LE(peHeaderAddress + 92)),
            NumberOfRvaAndSizes: this.intToHex(buf.readUInt32LE(peHeaderAddress + 132)),
            ImportsVA: this.intToHex(buf.readUInt32LE(peHeaderAddress + 132 + 12)),
        }


    }

    getSections () {
        let startAddress = this.buffer.readUInt32LE(60) + 264;
        let sectionsCount = this.getHeaders()['NumberOfSections'];

        let sections = [];

        for(let i = 0; i < sectionsCount; i++) {
            let addr = startAddress + i * 40;
            let sect = this.buffer.slice(addr, addr + 40);

            sections.push({
                name: this.getString(0, 8, sect),
                virtualSize: sect.readUInt32LE(8),
                virtualAddress: sect.readUInt32LE(12),
                sizeOfRawData: sect.readUInt32LE(16),
                pointerToRawData: sect.readUInt32LE(20),
                characteristics: sect.readUInt32LE(36),
            });

            // console.log(sect);
        }

        // console.log('sections', sections);
        return sections;

    }

}

module.exports = PEParser;
