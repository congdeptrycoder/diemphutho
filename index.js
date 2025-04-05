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
            // Lưu dữ liệu sinh viên vừa tìm được để dùng khi bật/tắt biểu đồ
            window.lastSearchedStudentData = studentData;

            // Nếu biểu đồ đang hiển thị, cập nhật highlight
            if (chartsContainer && chartsContainer.classList.contains('visible') && isChartDataProcessed) {
                highlightChartsForStudent(studentData);
            }
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
//chart
const CHART_CONFIG = {
    'Ngữ văn': { file: 'score_data.txt', key: 'Ngữ văn', bins: 11, range: [0, 10], labels: ["0-<1", "1-<2", "2-<3", "3-<4", "4-<5", "5-<6", "6-<7", "7-<8", "8-<9", "9-<10", "10"], canvasId: 'chart-van' },
    'Toán': { file: 'score_data.txt', key: 'Toán', bins: 11, range: [0, 10], labels: ["0-<1", "1-<2", "2-<3", "3-<4", "4-<5", "5-<6", "6-<7", "7-<8", "8-<9", "9-<10", "10"], canvasId: 'chart-toan' },
    'Tiếng Anh': { file: 'score_data.txt', key: 'Tiếng Anh', bins: 11, range: [0, 10], labels: ["0-<1", "1-<2", "2-<3", "3-<4", "4-<5", "5-<6", "6-<7", "7-<8", "8-<9", "9-<10", "10"], canvasId: 'chart-ta' },
    'KHTN': { file: 'score_data.txt', key: 'KHTN', bins: 11, range: [0, 10], labels: ["0-<1", "1-<2", "2-<3", "3-<4", "4-<5", "5-<6", "6-<7", "7-<8", "8-<9", "9-<10", "10"], canvasId: 'chart-khtn' },
    'LS&&ĐL': { file: 'score_data.txt', key: 'LS&&ĐL', bins: 11, range: [0, 10], labels: ["0-<1", "1-<2", "2-<3", "3-<4", "4-<5", "5-<6", "6-<7", "7-<8", "8-<9", "9-<10", "10"], canvasId: 'chart-ls' },
    'Tổng 5 môn': { file: 'score_data.txt', key: 'Tổng các môn', bins: 10, range: [0, 50], labels: ["0-5", "5-10", "10-15", "15-20", "20-25", "25-30", "30-35", "35-40", "40-45", "45-50"], canvasId: 'chart-total5' },
    'Tổng 3 môn': { file: 'score_data.txt', key: 'Tổng Toán, Văn, Anh', bins: 10, range: [0, 30], labels: ["0-3", "3-6", "6-9", "9-12", "12-15", "15-18", "18-21", "21-24", "24-27", "27-30"], canvasId: 'chart-total3' }
};

let processedChartData = null; // Lưu dữ liệu đã xử lý
window.scoreCharts = {}; // Lưu các đối tượng Chart.js
let isChartDataProcessed = false;
let isProcessingChartData = false;

const chartsContainer = document.getElementById('charts-container');
const toggleChartsButton = document.getElementById('toggle-charts-button');
const chartLoadingIndicator = document.getElementById('chart-loading-indicator');

// --- Hàm Xử lý Dữ liệu ---

// Hàm parse dòng điểm (có thể dùng lại hoặc điều chỉnh từ index.js)
// Đảm bảo nó trả về object với key là tên môn/tổng điểm
function parseScoreLineForChart(line) {
    const firstCommaIndex = line.indexOf(',');
    if (firstCommaIndex === -1) return null;
    const sbd = line.substring(0, firstCommaIndex).trim();
    const dataPart = line.substring(firstCommaIndex + 1).trim();
    if (!dataPart.startsWith('[[') || !dataPart.endsWith(']]')) return null;

    try {
        const jsonString = dataPart.replace(/'/g, '"');
        const scoresArray = JSON.parse(jsonString);
        const scores = { sbd: sbd };
        scoresArray.forEach(item => {
            if (Array.isArray(item) && item.length === 2) {
                const key = item[0]; // Tên môn hoặc tên tổng điểm
                const scoreValue = parseFloat(item[1]);
                scores[key] = isNaN(scoreValue) ? 0 : scoreValue; // Lưu điểm dạng số
            }
        });
        return scores;
    } catch (error) {
        console.error("Lỗi parse dòng điểm cho biểu đồ:", line, error);
        return null;
    }
}

// Hàm xác định index của bin dựa vào điểm và cấu hình
function getBinIndex(score, config) {
    if (score === undefined || score === null || isNaN(score)) return -1; // Không có điểm hoặc điểm không hợp lệ

    const [minRange, maxRange] = config.range;
    const numBins = config.bins;

    // Xử lý đặc biệt cho thang 10 điểm (bin cuối cùng cho điểm 10)
    if (maxRange === 10 && numBins === 11) {
        if (score < 0) return 0; // Điểm âm (nếu có) vào bin đầu
        if (score >= 10) return 10; // Điểm 10 hoặc hơn vào bin cuối
        return Math.max(0, Math.floor(score)); // 0-0.99 -> 0, 1-1.99 -> 1,... 9-9.99 -> 9
    }

    // Xử lý chung cho các thang điểm khác
    const binWidth = (maxRange - minRange) / numBins;
    if (score <= minRange) return 0; // Điểm nhỏ hơn hoặc bằng min vào bin 0
    if (score >= maxRange) return numBins - 1; // Điểm lớn hơn hoặc bằng max vào bin cuối

    const index = Math.floor((score - minRange) / binWidth);
    // Đảm bảo index nằm trong khoảng hợp lệ [0, numBins - 1]
    return Math.max(0, Math.min(index, numBins - 1));
}


// Hàm xử lý toàn bộ file score_data.txt để tạo dữ liệu cho biểu đồ
async function processScoreDataForCharts() {
    if (isChartDataProcessed || isProcessingChartData) return; // Chỉ xử lý 1 lần
    isProcessingChartData = true;
    chartLoadingIndicator.style.display = 'block';
    console.log("Bắt đầu xử lý dữ liệu biểu đồ...");

    try {
        const response = await fetch('sorted_by_total_all.txt'); // Dùng file gốc hoặc file đã sắp xếp
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.text();
        const lines = data.split('\n');

        // Khởi tạo cấu trúc đếm
        const counts = {};
        for (const subjectKey in CHART_CONFIG) {
            counts[subjectKey] = new Array(CHART_CONFIG[subjectKey].bins).fill(0);
        }

        // Duyệt qua từng dòng để đếm
        lines.forEach(line => {
            const studentScores = parseScoreLineForChart(line); // Parse dòng
            if (studentScores) {
                for (const subjectKey in CHART_CONFIG) {
                    const config = CHART_CONFIG[subjectKey];
                    const score = studentScores[config.key]; // Lấy điểm môn/tổng tương ứng
                    const binIndex = getBinIndex(score, config);
                    if (binIndex !== -1) { // Chỉ đếm nếu bin hợp lệ
                        counts[subjectKey][binIndex]++;
                    }
                }
            }
        });

        processedChartData = counts; // Lưu dữ liệu đã xử lý
        isChartDataProcessed = true;
        console.log("Xử lý dữ liệu biểu đồ hoàn tất.", processedChartData);

    } catch (error) {
        console.error("Lỗi nghiêm trọng khi xử lý dữ liệu biểu đồ:", error);
        alert("Không thể xử lý dữ liệu để tạo biểu đồ. Vui lòng kiểm tra file score_data.txt và thử lại.");
        processedChartData = null; // Đặt lại nếu lỗi
    } finally {
        isProcessingChartData = false;
        chartLoadingIndicator.style.display = 'none';
    }
}

// --- Hàm Tạo và Cập nhật Biểu đồ ---

/**
 * Tạo hoặc cập nhật một biểu đồ cụ thể.
 * @param {string} subjectKey Key trong CHART_CONFIG (ví dụ: 'Ngữ văn')
 * @param {number|null} highlightScore Điểm của thí sinh hiện tại để làm nổi bật, hoặc null.
 */
function createOrUpdateChart(subjectKey, highlightScore = null) {
    if (!isChartDataProcessed || !processedChartData || !processedChartData[subjectKey]) {
        console.warn(`Dữ liệu biểu đồ cho ${subjectKey} chưa sẵn sàng.`);
        return;
    }

    const config = CHART_CONFIG[subjectKey];
    const ctx = document.getElementById(config.canvasId)?.getContext('2d');
    if (!ctx) {
        console.error(`Không tìm thấy canvas với ID: ${config.canvasId}`);
        return;
    }

    const dataCounts = processedChartData[subjectKey];
    const labels = config.labels;
    const defaultColor = 'rgba(75, 192, 192, 0.6)';
    const highlightColor = 'rgba(255, 99, 132, 0.8)'; // Màu đỏ để làm nổi bật

    // Xác định màu nền cho các cột
    const backgroundColors = new Array(config.bins).fill(defaultColor);
    let highlightBinIndex = -1;
    if (highlightScore !== null && highlightScore !== undefined && !isNaN(highlightScore)) {
        highlightBinIndex = getBinIndex(highlightScore, config);
        if (highlightBinIndex !== -1) {
            backgroundColors[highlightBinIndex] = highlightColor;
        }
    }

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Số lượng thí sinh',
            data: dataCounts,
            backgroundColor: backgroundColors, // Mảng màu nền
            borderColor: backgroundColors.map(color => color.replace('0.6', '1').replace('0.8', '1')), // Màu viền đậm hơn
            borderWidth: 1
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true, // Giữ tỉ lệ hoặc đặt false nếu muốn tự đặt kích thước
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Số lượng thí sinh'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Khoảng điểm'
                }
            }
        },
        plugins: {
            legend: {
                display: false // Ẩn chú giải nếu chỉ có 1 dataset
            },
            tooltip: {
                callbacks: {
                    // title: function(tooltipItems) {
                    //     // Có thể tùy chỉnh tiêu đề tooltip nếu muốn
                    //     return `Khoảng điểm: ${tooltipItems[0].label}`;
                    // },
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += `${context.parsed.y} thí sinh`;
                        }
                        // Thêm đánh dấu nếu đây là khoảng điểm của người dùng
                        if (context.dataIndex === highlightBinIndex) {
                            label += ' (Điểm của bạn)';
                        }
                        return label;
                    }
                }
            }
        },
        animation: {
            duration: 500 // Thời gian animation khi vẽ/cập nhật (ms)
        }
    };

    // Kiểm tra nếu biểu đồ đã tồn tại thì cập nhật, nếu không thì tạo mới
    if (window.scoreCharts[config.canvasId]) {
        console.log(`Cập nhật biểu đồ: ${subjectKey}, Highlight score: ${highlightScore}, Highlight bin: ${highlightBinIndex}`);
        window.scoreCharts[config.canvasId].data.datasets[0].data = dataCounts; // Cập nhật data count (mặc dù có thể không đổi)
        window.scoreCharts[config.canvasId].data.datasets[0].backgroundColor = backgroundColors; // Cập nhật màu sắc
        window.scoreCharts[config.canvasId].data.datasets[0].borderColor = backgroundColors.map(color => color.replace('0.6', '1').replace('0.8', '1'));
        window.scoreCharts[config.canvasId].update();
    } else {
        console.log(`Tạo mới biểu đồ: ${subjectKey}, Highlight score: ${highlightScore}, Highlight bin: ${highlightBinIndex}`);
        window.scoreCharts[config.canvasId] = new Chart(ctx, {
            type: 'bar', // Loại biểu đồ cột
            data: chartData,
            options: chartOptions
        });
    }
}

// --- Hàm Tương tác ---

// Hàm cập nhật tất cả các biểu đồ với điểm highlight
function highlightChartsForStudent(studentScores) {
    // Kiểm tra dữ liệu đầu vào cẩn thận hơn
    if (!isChartDataProcessed) {
        console.warn("Dữ liệu biểu đồ chưa được xử lý.");
        return;
    }
    // Nếu studentScores là null (ví dụ: khi xóa highlight), lặp qua để xóa
    if (!studentScores) {
        console.log("Xóa highlight trên các biểu đồ.");
        for (const subjectKey in CHART_CONFIG) {
            createOrUpdateChart(subjectKey, null); // Gọi với null để xóa highlight
        }
        return;
    }

    // Kiểm tra cấu trúc cơ bản của studentScores
    if (!studentScores.sbd || !studentScores.scores) {
        console.warn("Dữ liệu điểm của sinh viên không đầy đủ hoặc không hợp lệ.");
        return;
    }

    console.log("Bắt đầu highlight biểu đồ cho SBD:", studentScores.sbd);

    for (const subjectKey in CHART_CONFIG) {
        const config = CHART_CONFIG[subjectKey];
        let score = null; // Khởi tạo score là null

        // Lấy điểm dựa vào key cấu hình
        const dataKey = config.key; // Ví dụ: 'Ngữ văn', 'Toán', 'Tổng các môn', ...

        if (dataKey === 'Tổng các môn') {
            score = studentScores.total5; // Lấy từ thuộc tính total5
        } else if (dataKey === 'Tổng Toán, Văn, Anh') {
            score = studentScores.total3; // Lấy từ thuộc tính total3
        } else if (studentScores.scores.hasOwnProperty(dataKey)) {
            // Đối với các môn học, lấy từ object lồng nhau 'scores'
            score = studentScores.scores[dataKey];
        } else {
            console.warn(`Không tìm thấy key điểm '${dataKey}' trong dữ liệu của SBD ${studentScores.sbd}`);
        }

        // Đảm bảo chỉ truyền số hợp lệ hoặc null vào hàm vẽ biểu đồ
        const scoreToHighlight = (typeof score === 'number' && !isNaN(score)) ? score : null;

        // Gọi hàm tạo/cập nhật biểu đồ với điểm số đã lấy được
        createOrUpdateChart(subjectKey, scoreToHighlight);
    }
}

// Thiết lập sự kiện cho nút Toggle
function setupChartToggle() {
    if (!toggleChartsButton) return;

    toggleChartsButton.addEventListener('click', async () => {
        const isVisible = chartsContainer.classList.contains('visible');

        if (!isVisible) {
            // Nếu chưa xử lý data, xử lý trước khi hiển thị
            if (!isChartDataProcessed && !isProcessingChartData) {
                await processScoreDataForCharts();
            }
            // Chỉ vẽ biểu đồ nếu xử lý data thành công
            if (isChartDataProcessed) {
                // Vẽ tất cả biểu đồ lần đầu (không highlight)
                for (const subjectKey in CHART_CONFIG) {
                    // Chỉ tạo mới nếu chưa tồn tại
                    if (!window.scoreCharts[CHART_CONFIG[subjectKey].canvasId]) {
                        createOrUpdateChart(subjectKey, null);
                    }
                }
                chartsContainer.style.display = 'block'; // Đặt display trước khi thêm class để transition hoạt động
                // Dùng timeout nhỏ để đảm bảo display được áp dụng
                setTimeout(() => chartsContainer.classList.add('visible'), 10);

                // Nếu đã có kết quả tìm kiếm trước đó, highlight luôn
                // Bạn cần cách để truy cập điểm của thí sinh đã tra cứu gần nhất
                // Ví dụ: Lưu vào biến global `lastSearchedStudentData` trong file index.js
                if (typeof lastSearchedStudentData !== 'undefined' && lastSearchedStudentData) {
                    highlightChartsForStudent(lastSearchedStudentData);
                }

            } else {
                // Có thể hiển thị thông báo lỗi nếu data không xử lý được
                alert("Không thể hiển thị biểu đồ do lỗi xử lý dữ liệu.");
            }
        } else {
            // Ẩn container
            chartsContainer.classList.remove('visible');
            // Có thể dùng event listener 'transitionend' để đặt lại display: none sau khi transition kết thúc
            chartsContainer.addEventListener('transitionend', () => {
                if (!chartsContainer.classList.contains('visible')) {
                    chartsContainer.style.display = 'none';
                }
            }, { once: true }); // Chỉ chạy listener 1 lần
        }
    });
}

// --- Khởi tạo ---
document.addEventListener('DOMContentLoaded', () => {
    setupChartToggle();
    processScoreDataForCharts();
});


