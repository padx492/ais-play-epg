const fs = require('fs');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

// เพิ่ม property 'displayName' เข้าไป เพื่อกำหนดชื่อที่จะแสดงใน TiviMate
const CHANNEL_MAPPING = [
// --- ช่องฟรีทีวีหลัก & ข่าว ---
    { myId: "2", searchName: "NBT", displayName: "NBT 2 HD" },
    { myId: "3", searchName: "Thai PBS", displayName: "Thai PBS HD" },
    { myId: "5", searchName: "TV5", displayName: "TV5 HD" },
    { myId: "7", searchName: "T Sports", displayName: "T Sports 7" },
    { myId: "10", searchName: "Parliament", displayName: "สถานีวิทยุโทรทัศน์รัฐสภา" },
    { myId: "16", searchName: "TNN", displayName: "TNN16" },
    { myId: "22", searchName: "Nation", displayName: "Nation TV" },
    { myId: "23", searchName: "Workpoint", displayName: "Workpoint TV" },
    { myId: "24", searchName: "True4U", displayName: "True4U" },
    { myId: "25", searchName: "GMM", displayName: "GMM 25" },
    { myId: "27", searchName: "Channel 8", displayName: "Channel 8" },
    { myId: "29", searchName: "Mono", displayName: "Mono29" },
    { myId: "30", searchName: "MCOT", displayName: "MCOT HD" },
    { myId: "31", searchName: "ONE", displayName: "ONE 31" },
    { myId: "32", searchName: "Thairath", displayName: "Thairath TV" },
    { myId: "33", searchName: "Channel 3", displayName: "Channel 3 HD" },
    { myId: "34", searchName: "Amarin", displayName: "Amarin TV" },
    { myId: "35", searchName: "Channel 7", displayName: "Channel 7 HD" },
    { myId: "36", searchName: "PPTV", displayName: "PPTV HD" },

    // --- ช่องภาพยนตร์ & ซีรีส์พรีเมียม (รวม Warner TV และ ROCK) ---
    { myId: "101", searchName: "HBO", displayName: "HBO" },
    { myId: "102", searchName: "Signature", displayName: "HBO Signature" },
    { myId: "103", searchName: "Hits", displayName: "HBO Hits" },
    { myId: "104", searchName: "Family", displayName: "HBO Family" },
    { myId: "105", searchName: "Cinemax", displayName: "Cinemax" },
    { myId: "109", searchName: "Warner TV", displayName: "Warner TV" },
    { myId: "111", searchName: "ROCK Action", displayName: "ROCK Action" },
    { myId: "112", searchName: "ROCK Entertainment", displayName: "ROCK Entertainment" },
    { myId: "113", searchName: "Thrill", displayName: "Thrill" },
    { myId: "114", searchName: "Celestial", displayName: "Celestial Movies" },

    // --- ช่อง 3BB Asian และซีรีส์เอเชีย ---
    { myId: "201", searchName: "3BB", displayName: "3BB Asian" },
    { myId: "202", searchName: "Asian", displayName: "3BB Asian+" },

    // --- ช่องการ์ตูน & อนิเมะ ---
    { myId: "301", searchName: "Cartoon", displayName: "Cartoon Network" },
    { myId: "302", searchName: "Boomerang", displayName: "Boomerang" },
    { myId: "303", searchName: "Disney", displayName: "Disney Channel" },
    { myId: "304", searchName: "Nickelodeon", displayName: "Nickelodeon" },

    // --- ช่องกีฬา ---
    { myId: "401", searchName: "Sport", displayName: "AIS PLAY Sport 1" },
    { myId: "402", searchName: "Sport", displayName: "AIS PLAY Sport 2" },
    { myId: "403", searchName: "Eurosport", displayName: "Eurosport 1" },
    { myId: "404", searchName: "BeIN", displayName: "beIN Sports" },

    // --- ช่องข่าวต่างประเทศ ---
    { myId: "601", searchName: "CNN", displayName: "CNN" },
    { myId: "602", searchName: "BBC", displayName: "BBC News" }
];

const EPG_SOURCE_URL = 'https://www.open-epg.com/files/thailand2.xml';

// ฟังก์ชันทำความสะอาดข้อความ XML ป้องกันปัญหาโค้ดเพี้ยน
function escapeXml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '\u0026amp;')
        .replace(/</g, '\u0026lt;')
        .replace(/>/g, '\u0026gt;')
        .replace(/"/g, '\u0026quot;')
        .replace(/\x27/g, '\u0026apos;');
}

async function generateRealEPG() {
    try {
        console.log('กำลังดาวน์โหลดและประมวลผลผังรายการจาก Open-EPG...');
        const response = await axios.get(EPG_SOURCE_URL, {
            responseType: 'text',
            timeout: 60000
        });

        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        const jsonObj = parser.parse(response.data);

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<tv generator-info-name="AISPLAY-OpenEPG-Real">\n';

        // 1. สร้างแท็ก Channel โดยดึงค่าจาก displayName ที่เรากำหนดไว้
        CHANNEL_MAPPING.forEach(ch => {
            xml += `  <channel id="${ch.myId}">\n`;
            xml += `    <display-name lang="th">${ch.displayName}</display-name>\n`;
            xml += `  </channel>\n`;
        });

        // 2. ดึงรายการ programme พร้อมกรองอักขระพิเศษ
        if (jsonObj.tv && jsonObj.tv.programme) {
            const programs = Array.isArray(jsonObj.tv.programme) ? jsonObj.tv.programme : [jsonObj.tv.programme];
            
            programs.forEach(prog => {
                const srcChannel = prog["@_channel"];
                const matched = CHANNEL_MAPPING.find(c => srcChannel && srcChannel.toLowerCase().includes(c.searchName.toLowerCase()));
                
                if (matched) {
                    const start = prog["@_start"] || "";
                    const stop = prog["@_stop"] || "";
                    
                    let rawTitle = prog.title ? (prog.title["#text"] || prog.title) : "รายการทีวี";
                    let rawDesc = prog.desc ? (prog.desc["#text"] || prog.desc) : "ไม่มีรายละเอียด";

                    const title = escapeXml(typeof rawTitle === 'string' ? rawTitle : 'รายการ');
                    const desc = escapeXml(typeof rawDesc === 'string' ? rawDesc : 'รายละเอียด');

                    xml += `  <programme start="${start}" stop="${stop}" channel="${matched.myId}">\n`;
                    xml += `    <title lang="th">${title}</title>\n`;
                    xml += `    <desc lang="th">${desc}</desc>\n`;
                    xml += `  </programme>\n`;
                }
            });
        }

        xml += '</tv>';

        fs.writeFileSync('epg.xml', xml, 'utf8');
        console.log('สร้างไฟล์ epg.xml ผังจริงสำเร็จเรียบร้อย!');

    } catch (error) {
        console.error('เกิดข้อผิดพลาด:', error.message);
        process.exit(1);
    }
}

generateRealEPG();
