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
const totalStudents = 22137; // Tổng số thí sinh đã biết

// Hàm để xóa kết quả cũ và ẩn thông báo lỗi
function clearResults() {
    // Đặt lại điểm trong bảng
    scoreTable.querySelector('.scorevan').textContent = '-';
    scoreTable.querySelector('.scoretoan').textContent = '-';
    scoreTable.querySelector('.scoreta').textContent = '-';
    scoreTable.querySelector('.scorekhtn').textContent = '-';
    scoreTable.querySelector('.scorels').textContent = '-';
    // Đặt lại tổng điểm
    sum5Span.textContent = '0 điểm';
    sum3Span.textContent = '0 điểm';
    // Ẩn khung kết quả
    resultBox.style.display = 'none';
    // Ẩn thông báo lỗi
    errorMsgElement.style.display = 'none';
    errorMsgElement.textContent = '';
    // Xóa nội dung so sánh điểm
    document.querySelectorAll('#sosanh .sosanh-diem').forEach(td => {
        td.textContent = '';
        td.className = 'sosanh-diem'; // Reset class
    });
    // Reset rank
    rank5Span.textContent = `-/${totalStudents}`;
    rank3Span.textContent = `-/${totalStudents}`;
}

// Hàm hiển thị thông báo lỗi
function displayError(message) {
    errorMsgElement.textContent = message;
    errorMsgElement.style.display = 'block';
    resultBox.style.display = 'none'; // Ẩn kết quả nếu có lỗi
    searchStatus.style.display = 'none'; // Ẩn trạng thái đang tìm
    // Reset rank khi có lỗi chung
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
        const lines = text.split('\n'); // Tách thành các dòng

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue; // Bỏ qua dòng trống

            // Lấy SBD từ đầu dòng một cách an toàn
            const commaIndex = line.indexOf(',');
            if (commaIndex > 0) { // Đảm bảo có dấu phẩy và có ký tự trước nó
                const currentSbd = line.substring(0, commaIndex).trim();
                if (currentSbd === sbdToFind) {
                    return i + 1; // Rank chính là index + 1
                }
            } else {
                // Có thể ghi log nếu dòng không đúng định dạng
                // console.warn(`Dòng không đúng định dạng trong ${filePath}: ${line}`);
            }
        }
        return null; // Không tìm thấy SBD trong file này
    } catch (error) {
        console.error(`Lỗi khi xử lý file xếp hạng ${filePath}:`, error);
        return null; // Lỗi xử lý file
    }
};
// Hàm xử lý dữ liệu dòng từ file .txt
function parseScoreLine(line) {
    // Tách SBD và phần dữ liệu điểm bằng dấu phẩy đầu tiên
    const firstCommaIndex = line.indexOf(',');
    if (firstCommaIndex === -1) return null; // Định dạng không hợp lệ

    const sbd = line.substring(0, firstCommaIndex).trim();
    const dataPart = line.substring(firstCommaIndex + 1).trim();

    // Kiểm tra xem dataPart có phải là dạng mảng [[...]] không
    if (!dataPart.startsWith('[[') || !dataPart.endsWith(']]')) return null;

    try {
        // Cố gắng chuyển đổi chuỗi thành một cấu trúc gần giống JSON
        // Thay thế dấu nháy đơn thành nháy kép để JSON.parse hoạt động
        // Cẩn thận: Cách này có thể lỗi nếu tên môn học chứa dấu nháy kép
        const jsonString = dataPart.replace(/'/g, '"');
        const scoresArray = JSON.parse(jsonString);

        const scores = {};
        let totalScore5 = 0;
        let totalScore3 = 0;
        let scoreVan = 0, scoreToan = 0, scoreTA = 0; // Khởi tạo điểm 3 môn chính

        scoresArray.forEach(item => {
            if (Array.isArray(item) && item.length === 2) {
                const subject = item[0];
                const scoreValue = parseFloat(item[1]); // Chuyển điểm sang số

                if (!isNaN(scoreValue)) { // Chỉ xử lý nếu điểm là số hợp lệ
                    scores[subject] = scoreValue; // Lưu điểm dạng số
                    totalScore5 += scoreValue; // Cộng vào tổng 5 môn

                    // Xác định và cộng điểm 3 môn chính
                    if (subject === 'Ngữ văn') {
                        scoreVan = scoreValue;
                    } else if (subject === 'Toán') {
                        scoreToan = scoreValue;
                    } else if (subject === 'Tiếng Anh') {
                        scoreTA = scoreValue;
                    }
                } else {
                    scores[subject] = 0; // Hoặc '-' nếu muốn hiển thị khác
                }
            }
        });

        // Tính tổng 3 môn sau khi đã duyệt qua tất cả
        totalScore3 = scoreVan + scoreToan + scoreTA;


        return {
            sbd: sbd,
            scores: scores,
            total5: totalScore5,
            total3: totalScore3
        };

    } catch (error) {
        console.error("Lỗi phân tích cú pháp dòng:", line, error);
        return null; // Trả về null nếu có lỗi parse JSON
    }
}

// Hàm cập nhật bảng so sánh điểm chuẩn
function updateComparisonTable(totalScore3) {
    const comparisonRows = document.querySelectorAll('#sosanh tbody tr');
    comparisonRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) { // Đảm bảo hàng có đủ cột
            const benchmarkCell = cells[2];
            const comparisonCell = cells[3];
            comparisonCell.className = 'sosanh-diem'; // Reset class

            const benchmarkScoreStr = benchmarkCell.textContent.replace(',', '.'); // Thay dấu phẩy thành chấm
            const benchmarkScore = parseFloat(benchmarkScoreStr);


            if (!isNaN(benchmarkScore) && !isNaN(totalScore3)) {
                const difference = totalScore3 - benchmarkScore;
                comparisonCell.textContent = (difference >= 0 ? '+' : '') + difference.toFixed(2);
                if (difference >= 0) {
                    comparisonCell.classList.add('hon'); // Thêm class 'hon' nếu điểm cao hơn hoặc bằng
                } else {
                    comparisonCell.classList.add('kem'); // Thêm class 'kem' nếu điểm thấp hơn
                }
            } else {
                comparisonCell.textContent = '-'; // Hiển thị '-' nếu không tính được
            }
        }
    });
}


// Gắn sự kiện 'click' cho nút tìm kiếm
searchButton.addEventListener('click', async () => {
    const sbdToSearch = searchInput.value.trim(); // Lấy SBD và xóa khoảng trắng thừa

    if (!sbdToSearch) {
        displayError('Vui lòng nhập số báo danh.');
        return; // Không làm gì nếu input rỗng
    }

    clearResults(); // Xóa kết quả cũ trước khi tìm kiếm mới
    searchStatus.style.display = 'inline'; // Hiển thị "Đang tìm kiếm..."

    try {
        // Sử dụng fetch để lấy nội dung file txt
        // Đảm bảo file exam_scores_phutho.txt nằm cùng cấp hoặc đúng đường dẫn
        const response = await fetch('score_data.txt');

        if (!response.ok) { // Kiểm tra xem fetch có thành công không
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.text(); // Lấy nội dung text từ response
        const lines = data.split('\n'); // Tách thành các dòng

        let studentData = null;
        for (const line of lines) {
            if (line.trim() === '') continue; // Bỏ qua dòng trống

            const parsedData = parseScoreLine(line);
            if (parsedData && parsedData.sbd === sbdToSearch) {
                studentData = parsedData;
                break; // Tìm thấy, thoát vòng lặp
            }
        }

        searchStatus.style.display = 'none'; // Ẩn "Đang tìm kiếm..."

        if (studentData) {
            // Hiển thị điểm lên bảng
            // Sử dụng toFixed(2) để hiển thị 2 chữ số thập phân
            // Sử dụng || '-' để hiển thị '-' nếu môn nào đó không có điểm (hoặc là 0)
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
            // Hiển thị khung kết quả
            resultBox.style.display = 'block';
        } else {
            displayError('Không tìm thấy thí sinh với số báo danh này.');
        }

    } catch (error) {
        searchStatus.style.display = 'none'; // Ẩn "Đang tìm kiếm..."
        console.error('Lỗi khi tải hoặc xử lý file:', error);
        displayError('Không thể tải hoặc xử lý dữ liệu điểm. Vui lòng thử lại.');
    }
});

// Thêm sự kiện nhấn Enter trên input để tìm kiếm
searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        searchButton.click(); // Giả lập hành động click nút tìm kiếm
    }
});
const button105 = document.querySelector('.top105');
const table105 = document.querySelector('.top105-table');

button105.addEventListener('click', function () {
    if (table105.style.display === 'block') {
        table105.style.display = 'none'; // Ẩn table nếu đang hiển thị
    } else {
        table105.style.display = 'block'; // Hiển thị table nếu đang ẩn
    }
});
const button103 = document.querySelector('.top103');
const table103 = document.querySelector('.top103-table');

button103.addEventListener('click', function () {
    if (table103.style.display === 'block') {
        table103.style.display = 'none'; // Ẩn table nếu đang hiển thị
    } else {
        table103.style.display = 'block'; // Hiển thị table nếu đang ẩn
    }
});