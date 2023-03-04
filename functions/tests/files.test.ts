import { fileBeingUsed, getFilePath, parseDate, parseFilePath } from "../src/files"

describe("files", () => {
    it("parsePosts happy path", () => {
        const userFiles = { "MvOomgxG3GaGR7dWvqnsz1G5Jk23": ["rketrain.jpg", "nih.jpg", "contribute.jpg", "rkebridge1.jpeg", "rkelion1.jpg", "iitr1.jpg", "dsc_0041.jpg", "dsc_0042.jpg", "roorkee 001.jpg", "roorkee 002.jpg", "roorkee 003.jpg", "roorkee 004.jpg", "roorkee 005.jpg", "roorkee 006.jpg", "roorkee 007.jpg", "roorkee 008.jpg", "roorkee 009.jpg", "roorkee 010.jpg", "roorkee 011.jpg", "roorkee 012.jpg", "roorkee 013.jpg", "roorkee 014.jpg", "roorkee 015.jpg", "roorkee 016.jpg", "roorkee 017.jpg", "roorkee 018.jpg"], "NTh3DiJM31cDHk4rx914BONDT9k1": ["IMG_0421.JPG"] };
        expect(fileBeingUsed({ "fileName": "sample_1920×1280_200x200.jpeg", "id": "MvOomgxG3GaGR7dWvqnsz1G5Jk23-sample_1920×1280_200x200.jpeg-s", "imageSize": "s", "userId": "MvOomgxG3GaGR7dWvqnsz1G5Jk23", "imageDimensions": "200x200", "timeCreated": "2022-08-30T21:25:28.984Z" }, userFiles)).toBe(false);
        expect(fileBeingUsed({ "fileName": "roorkee 007.jpg", "id": "MvOomgxG3GaGR7dWvqnsz1G5Jk23-sample_1920×1280_200x200.jpeg-s", "imageSize": "s", "userId": "MvOomgxG3GaGR7dWvqnsz1G5Jk23", "imageDimensions": "200x200", "timeCreated": "2022-08-30T21:25:28.984Z" }, userFiles)).toBe(true);
    });

    //Test parseFilePath
    it("parseFilePath happy path", () => {
        const filePath = "users/MvOomgxG3GaGR7dWvqnsz1G5Jk23/images/sample_680x680.jpeg";
        const expected = {
            "userId": "MvOomgxG3GaGR7dWvqnsz1G5Jk23",
            "fileName": "sample.jpeg",
            "imageSize": "m",
            "imageDimensions": "680x680"
        };
        expect(parseFilePath(filePath)).toEqual(expected);
    });

    //Test parseFilePath
    it("parseFilePath happy path 2", () => {
        const filePath = "users/MvOomgxG3GaGR7dWvqnsz1G5Jk23/images/20210730_203540_1920x1080.jpg";
        const expected = {
            "userId": "MvOomgxG3GaGR7dWvqnsz1G5Jk23",
            "fileName": "20210730_203540.jpg",
            "imageSize": "l",
            "imageDimensions": "1920x1080"
        };
        expect(parseFilePath(filePath)).toEqual(expected);
    });
    
    //Test parseFilePath
    it("parseFilePath happy path 2", () => {
        const filePath = "users/MvOomgxG3GaGR7dWvqnsz1G5Jk23/images/sample_1920×1280_1920x1080.jpeg";
        const expected = {
            "userId": "MvOomgxG3GaGR7dWvqnsz1G5Jk23",
            "fileName": "sample_1920×1280.jpeg",
            "imageSize": "l",
            "imageDimensions": "1920x1080"
        };
        expect(parseFilePath(filePath)).toEqual(expected);
    });
    
    //Test parseDate
    it("parseDate happy path", () => {
        const date = "2022-08-30T21:25:28.984Z";
        const expected = 1661894728000;
        expect(parseDate(date)).toEqual(expected);
    });

    //Test getFilePath
    it("getFilePath happy path", () => {
        const imageDetails = {
            "fileName": "sample_1920×1280.jpeg",
            "id": "MvOomgxG3GaGR7dWvqnsz1G5Jk23-sample_1920×1280_200x200.jpeg-s",
            "imageSize": "s",
            "imageDimensions": "200x200",
            "userId": "MvOomgxG3GaGR7dWvqnsz1G5Jk23"
        };
        const expected = "users/MvOomgxG3GaGR7dWvqnsz1G5Jk23/images/sample_1920×1280_200x200.jpeg";
        expect(getFilePath(imageDetails)).toEqual(expected);
    });
});