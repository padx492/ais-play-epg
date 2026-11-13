const fs = require('fs');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const CHANNEL_MAPPING = [
    { myId: "2", searchName: "NBT" },
    { myId: "3", searchName: "Thai PBS" },
    { myId: "5", searchName: "TV5" },
    { myId: "7", searchName: "T Sports" },
    { myId: "16", searchName: "TNN" },
    { myId: "22", searchName: "Nation" },
    { myId: "23", searchName: "Workpoint" },
    { myId: "24", searchName: "True4U" },
    { myId: "25", searchName: "GMM" },
    { myId: "27", searchName: "Channel 8" },
    { myId: "30", searchName: "MCOT" },
    { myId: "31", searchName: "ONE" },
    { myId: "32", searchName: "Thairath" },
    { myId: "33", searchName: "Channel 3" },
    { myId: "34", searchName: "Amarin" },
    { myId: "35", searchName: "Channel 7" },
    { myId: "36", searchName: "PPTV" },
    { myId: "101", searchName: "HBO" }
];

const EPG_SOURCE_URL = 'https://www.open-epg.com/files/thailand2.xml';

// ฟังก์ชันทำความสะอาดข้อความ XML ที่แก้ไข Syntax ให้ถูกต้องแล้ว
function escapeXml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, ''');
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

        // 1. สร้างแท็ก Channel
        CHANNEL_MAPPING.forEach(ch => {
            xml += `  <channel id="${ch.myId}">\n`;
            xml += `    <display-name lang="th">ช่อง ${ch.myId}</display-name>\n`;
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
