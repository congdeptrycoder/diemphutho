const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultBox = document.querySelector('.result-box');
const scoreTable = document.getElementById('bang-diem');
const sum5Span = document.getElementById('sum5');
const sum3Span = document.getElementById('sum3');
const searchStatus = document.getElementById('search-status');
const errorMsgElement = document.getElementById('error-msg');

const rank5Span = document.getElementById('rank5');
const rank3Span = document.getElementById('rank3');
const totalStudents = 22137;

function clearResults() {

    scoreTable.querySelector('.scorevan').textContent = '-';
    scoreTable.querySelector('.scoretoan').textContent = '-';
    scoreTable.querySelector('.scoreta').textContent = '-';
    scoreTable.querySelector('.scorekhtn').textContent = '-';
    scoreTable.querySelector('.scorels').textContent = '-';

    sum5Span.textContent = '0 điểm';
    sum3Span.textContent = '0 điểm';

    resultBox.style.display = 'none';

    errorMsgElement.style.display = 'none';
    errorMsgElement.textContent = '';

    document.querySelectorAll('#sosanh .sosanh-diem').forEach(td => {
        td.textContent = '';
        td.className = 'sosanh-diem';
    });

    rank5Span.textContent = `-/${totalStudents}`;
    rank3Span.textContent = `-/${totalStudents}`;
}

// Hàm hiển thị thông báo lỗi
function displayError(message) {
    errorMsgElement.textContent = message;
    errorMsgElement.style.display = 'block';
    resultBox.style.display = 'none';
    searchStatus.style.display = 'none';

    rank5Span.textContent = `-/${totalStudents}`;
    rank3Span.textContent = `-/${totalStudents}`;
}

// Hàm tìm hạng trong file đã sắp xếp (tối ưu hơn bằng cách chỉ đọc và tìm)
const findRankInSortedFile = async (filePath, sbdToFind) => {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            console.error(`Lỗi tải file xếp hạng ${filePath}: ${response.status}`);
            return null; // Lỗi tải file
        }
        const text = await response.text();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;


            const commaIndex = line.indexOf(',');
            if (commaIndex > 0) {
                const currentSbd = line.substring(0, commaIndex).trim();
                if (currentSbd === sbdToFind) {
                    return i + 1;
                }
            } else {

            }
        }
        return null; // Không tìm thấy SBD trong file này
    } catch (error) {
        console.error(`Lỗi khi xử lý file xếp hạng ${filePath}:`, error);
        return null;
    }
};
// Hàm xử lý dữ liệu dòng từ file .txt
function parseScoreLine(line) {
    // Tách SBD và phần dữ liệu điểm bằng dấu phẩy đầu tiên
    const firstCommaIndex = line.indexOf(',');
    if (firstCommaIndex === -1) return null; // Định dạng không hợp lệ

    const sbd = line.substring(0, firstCommaIndex).trim();
    const dataPart = line.substring(firstCommaIndex + 1).trim();


    if (!dataPart.startsWith('[[') || !dataPart.endsWith(']]')) return null;

    try {

        const jsonString = dataPart.replace(/'/g, '"');
        const scoresArray = JSON.parse(jsonString);

        const scores = {};
        let totalScore5 = 0;
        let totalScore3 = 0;
        let scoreVan = 0, scoreToan = 0, scoreTA = 0;

        scoresArray.forEach(item => {
            if (Array.isArray(item) && item.length === 2) {
                const subject = item[0];
                const scoreValue = parseFloat(item[1]);

                if (!isNaN(scoreValue)) {
                    scores[subject] = scoreValue;
                    totalScore5 += scoreValue;

                    if (subject === 'Ngữ văn') {
                        scoreVan = scoreValue;
                    } else if (subject === 'Toán') {
                        scoreToan = scoreValue;
                    } else if (subject === 'Tiếng Anh') {
                        scoreTA = scoreValue;
                    }
                } else {
                    scores[subject] = 0;
                }
            }
        });

        totalScore3 = scoreVan + scoreToan + scoreTA;


        return {
            sbd: sbd,
            scores: scores,
            total5: totalScore5,
            total3: totalScore3
        };

    } catch (error) {
        console.error("Lỗi phân tích cú pháp dòng:", line, error);
        return null;
    }
}

// Hàm cập nhật bảng so sánh điểm chuẩn
function updateComparisonTable(totalScore3) {
    const comparisonRows = document.querySelectorAll('#sosanh tbody tr');
    comparisonRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
            const benchmarkCell = cells[2];
            const comparisonCell = cells[3];
            comparisonCell.className = 'sosanh-diem';

            const benchmarkScoreStr = benchmarkCell.textContent.replace(',', '.');
            const benchmarkScore = parseFloat(benchmarkScoreStr);


            if (!isNaN(benchmarkScore) && !isNaN(totalScore3)) {
                const difference = totalScore3 - benchmarkScore;
                comparisonCell.textContent = (difference >= 0 ? '+' : '') + difference.toFixed(2);
                if (difference >= 0) {
                    comparisonCell.classList.add('hon');
                } else {
                    comparisonCell.classList.add('kem');
                }
            } else {
                comparisonCell.textContent = '-';
            }
        }
    });
}


searchButton.addEventListener('click', async () => {
    const sbdToSearch = searchInput.value.trim();

    if (!sbdToSearch) {
        displayError('Vui lòng nhập số báo danh.');
        return;
    }

    clearResults();
    searchStatus.style.display = 'inline';

    try {
        // Sử dụng fetch để lấy nội dung file txt
        const response = await fetch('score_data.txt');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.text();
        const lines = data.split('\n');

        let studentData = null;
        for (const line of lines) {
            if (line.trim() === '') continue;
            const parsedData = parseScoreLine(line);
            if (parsedData && parsedData.sbd === sbdToSearch) {
                studentData = parsedData;
                break;
            }
        }

        searchStatus.style.display = 'none'; // Ẩn "Đang tìm kiếm..."

        if (studentData) {
            // Hiển thị điểm lên bảng

            scoreTable.querySelector('.scorevan').textContent = studentData.scores['Ngữ văn']?.toFixed(2) || '-';
            scoreTable.querySelector('.scoretoan').textContent = studentData.scores['Toán']?.toFixed(2) || '-';
            scoreTable.querySelector('.scoreta').textContent = studentData.scores['Tiếng Anh']?.toFixed(2) || '-';
            scoreTable.querySelector('.scorekhtn').textContent = studentData.scores['KHTN']?.toFixed(2) || '-';
            scoreTable.querySelector('.scorels').textContent = studentData.scores['LS&&ĐL']?.toFixed(2) || '-';

            // Hiển thị tổng điểm
            sum5Span.textContent = `${studentData.total5.toFixed(2)} điểm`;
            sum3Span.textContent = `${studentData.total3.toFixed(2)} điểm`;

            // Cập nhật bảng so sánh
            updateComparisonTable(studentData.total3);
            try {
                const [rank5Result, rank3Result] = await Promise.all([
                    findRankInSortedFile('sorted_by_total_all.txt', sbdToSearch),
                    findRankInSortedFile('sorted_by_total_tva.txt', sbdToSearch)
                ]);

                // Cập nhật DOM với kết quả xếp hạng
                rank5Span.textContent = rank5Result !== null ? `${rank5Result}/${totalStudents}` : `Không tìm thấy/${totalStudents}`;
                rank3Span.textContent = rank3Result !== null ? `${rank3Result}/${totalStudents}` : `Không tìm thấy/${totalStudents}`;

            } catch (rankError) {
                console.error("Lỗi khi thực hiện tìm kiếm xếp hạng song song:", rankError);
                rank5Span.textContent = `Lỗi/${totalStudents}`;
                rank3Span.textContent = `Lỗi/${totalStudents}`;
            }
            //result box
            resultBox.style.display = 'block';
            setTimeout(() => {
                resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            displayError('Không tìm thấy thí sinh với số báo danh này.');
        }

    } catch (error) {
        searchStatus.style.display = 'none';
        console.error('Lỗi khi tải hoặc xử lý file:', error);
        displayError('Không thể tải hoặc xử lý dữ liệu điểm. Vui lòng thử lại.');
    }
});

// Thêm sự kiện nhấn Enter trên input để tìm kiếm
searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        searchButton.click();
    }
});
const button105 = document.querySelector('.top105');
const table105 = document.querySelector('.top105-table');

button105.addEventListener('click', function () {
    if (table105.style.display === 'block') {
        table105.style.display = 'none';
    } else {
        table105.style.display = 'block';
    }
});
const button103 = document.querySelector('.top103');
const table103 = document.querySelector('.top103-table');

button103.addEventListener('click', function () {
    if (table103.style.display === 'block') {
        table103.style.display = 'none';
    } else {
        table103.style.display = 'block';
    }
});