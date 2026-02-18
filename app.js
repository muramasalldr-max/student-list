const STUDENT_KEY = "ds_students";
const BOOKING_KEY = "ds_bookings";

const studentForm = document.getElementById("studentForm");
const studentFormError = document.getElementById("studentFormError");
const studentList = document.getElementById("studentList");
const studentListEmpty = document.getElementById("studentListEmpty");
const studentDetail = document.getElementById("studentDetail");
const detailName = document.getElementById("detailName");
const detailMeta = document.getElementById("detailMeta");
const calendar = document.getElementById("calendar");
const currentMonthLabel = document.getElementById("currentMonth");
const prevMonthButton = document.getElementById("prevMonth");
const nextMonthButton = document.getElementById("nextMonth");
const deleteStudentButton = document.getElementById("deleteStudent");
const addBookingButton = document.getElementById("addBooking");
const scheduleDate = document.getElementById("scheduleDate");
const scheduleList = document.getElementById("scheduleList");
const scheduleEmpty = document.getElementById("scheduleEmpty");
const todayLabel = document.getElementById("todayLabel");
const todayBookings = document.getElementById("todayBookings");
const todayEmpty = document.getElementById("todayEmpty");

let students = loadStudents();
let bookings = loadBookings();
let selectedStudentId = null;
let currentMonth = new Date();
let selectedDate = formatDate(new Date());

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function loadStudents() {
  const saved = localStorage.getItem(STUDENT_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveStudents() {
  localStorage.setItem(STUDENT_KEY, JSON.stringify(students));
}

function loadBookings() {
  const saved = localStorage.getItem(BOOKING_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveBookings() {
  localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
}

function validateStudentForm({ name, weekday, startTime, durationMin, lessonsPerMonth }) {
  if (!name.trim()) {
    return "生徒名を入力してください。";
  }
  if (!weekday) {
    return "曜日を選択してください。";
  }
  if (!startTime) {
    return "開始時刻を入力してください。";
  }
  if (!durationMin || durationMin <= 0) {
    return "1コマ分数は1以上で入力してください。";
  }
  if (!lessonsPerMonth || lessonsPerMonth <= 0) {
    return "月の回数は1以上で入力してください。";
  }
  return "";
}

function createStudent(formData) {
  const duplicate = students.find(
    (student) => student.name.trim() === formData.name.trim()
  );
  if (duplicate) {
    return { ok: false, message: "同名の生徒が既に登録されています。" };
  }

  const student = {
    id: crypto.randomUUID(),
    name: formData.name.trim(),
    weekday: formData.weekday,
    startTime: formData.startTime,
    durationMin: Number(formData.durationMin),
    lessonsPerMonth: Number(formData.lessonsPerMonth),
    createdAt: new Date().toISOString(),
  };

  students.push(student);
  saveStudents();
  return { ok: true, student };
}

function listStudents() {
  studentList.innerHTML = '<option value="">生徒を選択してください</option>';
  studentListEmpty.classList.toggle("hidden", students.length > 0);

  students
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
    .forEach((student) => {
      const option = document.createElement("option");
      option.value = student.id;
      option.textContent = `${student.name}（${student.weekday} / ${student.startTime} / ${student.durationMin}分 / 月${student.lessonsPerMonth}回）`;
      if (student.id === selectedStudentId) {
        option.selected = true;
      }
      studentList.appendChild(option);
    });
}

function selectStudent(studentId) {
  selectedStudentId = studentId;
  studentList.value = studentId;
  const student = students.find((item) => item.id === studentId);
  if (!student) {
    return;
  }
  detailName.textContent = `${student.name} の予約カレンダー`;
  detailMeta.textContent = `${student.weekday} / ${student.startTime} / ${student.durationMin}分 / 月${student.lessonsPerMonth}回`;
  deleteStudentButton.disabled = false;
  addBookingButton.disabled = false;
  studentDetail.classList.remove("hidden");
  renderCalendar();
  renderSchedule(selectedDate);
}

function renderEmptyDetail() {
  selectedStudentId = null;
  studentList.value = "";
  detailName.textContent = "生徒を選択してください";
  detailMeta.textContent = "生徒を選択するとカレンダーに予約を追加できます。";
  deleteStudentButton.disabled = true;
  addBookingButton.disabled = true;
  studentDetail.classList.remove("hidden");
  renderCalendar();
  renderSchedule(selectedDate);
}

function deleteStudent(studentId) {
  const student = students.find((item) => item.id === studentId);
  if (!student) {
    return { ok: false, message: "生徒情報が見つかりません。" };
  }

  const hasBookings = bookings.some((booking) => booking.studentId === studentId);
  const confirmMessage = hasBookings
    ? "この生徒の予約も削除されます。本当に削除しますか？"
    : "この生徒を削除しますか？";

  if (!confirm(confirmMessage)) {
    return { ok: false, message: "削除をキャンセルしました。" };
  }

  students = students.filter((item) => item.id !== studentId);
  bookings = bookings.filter((booking) => booking.studentId !== studentId);
  saveStudents();
  saveBookings();
  return { ok: true };
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}年${month}月`;
}

function addMinutes(time, minutes) {
  const [hours, mins] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes, 0, 0);
  const endHours = String(date.getHours()).padStart(2, "0");
  const endMinutes = String(date.getMinutes()).padStart(2, "0");
  return `${endHours}:${endMinutes}`;
}

function createBooking({ studentId, date, startTime, endTime }) {
  const conflict = bookings.find(
    (booking) => booking.date === date && booking.startTime === startTime
  );
  if (conflict) {
    return { ok: false, message: "同じ日時に既に予約があります。" };
  }

  const student = students.find((item) => item.id === studentId);
  if (!student) {
    return { ok: false, message: "生徒情報が見つかりません。" };
  }

  const booking = {
    id: crypto.randomUUID(),
    studentId,
    date,
    startTime,
    endTime,
    status: "確定",
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);
  saveBookings();
  return { ok: true, booking };
}

function deleteBooking(bookingId) {
  const booking = bookings.find((item) => item.id === bookingId);
  if (!booking) {
    return { ok: false, message: "予約が見つかりません。" };
  }
  if (!confirm("この予約を削除しますか？")) {
    return { ok: false, message: "削除をキャンセルしました。" };
  }
  bookings = bookings.filter((item) => item.id !== bookingId);
  saveBookings();
  return { ok: true };
}

function listBookingsByDate(date) {
  return bookings
    .filter((booking) => booking.date === date)
    .map((booking) => ({
      ...booking,
      studentName: students.find((student) => student.id === booking.studentId)?.name ?? "不明",
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function renderSchedule(date) {
  selectedDate = date;
  const dateObject = new Date(date);
  scheduleDate.textContent = `${dateObject.getFullYear()}年${dateObject.getMonth() + 1}月${dateObject.getDate()}日のスケジュール`;
  const items = listBookingsByDate(date);

  scheduleList.innerHTML = "";
  scheduleEmpty.classList.toggle("hidden", items.length > 0);

  items.forEach((booking) => {
    const li = document.createElement("li");
    li.className = "schedule-item";

    const infoButton = document.createElement("button");
    infoButton.type = "button";
    infoButton.innerHTML = `
      <div class="schedule-time">${booking.startTime} - ${booking.endTime}</div>
      <div class="schedule-student">${booking.studentName}</div>
    `;
    infoButton.addEventListener("click", () => {
      const result = deleteBooking(booking.id);
      if (!result.ok) {
        return;
      }
      renderCalendar();
      renderSchedule(selectedDate);
      renderTodayBookings();
    });

    const deleteHint = document.createElement("span");
    deleteHint.className = "schedule-action";
    deleteHint.textContent = "削除";

    li.appendChild(infoButton);
    li.appendChild(deleteHint);
    scheduleList.appendChild(li);
  });
}

function renderCalendar() {
  calendar.innerHTML = "";
  currentMonthLabel.textContent = formatMonth(currentMonth);

  weekdays.forEach((day) => {
    const header = document.createElement("div");
    header.className = "calendar-header";
    header.textContent = day;
    calendar.appendChild(header);
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startIndex = firstDay.getDay();
  const totalCells = startIndex + lastDay.getDate();
  const today = formatDate(new Date());

  for (let index = 0; index < totalCells; index += 1) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";

    if (index < startIndex) {
      cell.classList.add("disabled");
      calendar.appendChild(cell);
      continue;
    }

    const dayNumber = index - startIndex + 1;
    const cellDate = new Date(year, month, dayNumber);
    const cellDateKey = formatDate(cellDate);

    const dateLabel = document.createElement("div");
    dateLabel.className = "calendar-date";
    dateLabel.textContent = dayNumber;
    cell.appendChild(dateLabel);

    if (cellDateKey === today) {
      cell.classList.add("today");
    }

    if (cellDateKey === selectedDate) {
      cell.classList.add("selected");
    }

    const dayBookings = listBookingsByDate(cellDateKey);
    if (dayBookings.length) {
      const check = document.createElement("div");
      check.className = "calendar-check";
      check.textContent = "✓";
      cell.appendChild(check);
    }

    cell.addEventListener("click", () => handleDateClick(cellDateKey));
    calendar.appendChild(cell);
  }
}

function handleDateClick(date) {
  renderSchedule(date);
  renderCalendar();
}

function renderTodayBookings() {
  const today = new Date();
  todayLabel.textContent = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const todayKey = formatDate(today);
  const todayItems = listBookingsByDate(todayKey);

  todayBookings.innerHTML = "";
  todayEmpty.classList.toggle("hidden", todayItems.length > 0);

  todayItems.forEach((booking) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${booking.startTime}-${booking.endTime} ${booking.studentName}`;
    button.addEventListener("click", () => {
      const result = deleteBooking(booking.id);
      if (!result.ok) {
        return;
      }
      renderCalendar();
      renderSchedule(selectedDate);
      renderTodayBookings();
    });
    li.appendChild(button);
    todayBookings.appendChild(li);
  });
}


studentList.addEventListener("change", (event) => {
  const studentId = event.target.value;
  if (!studentId) {
    renderEmptyDetail();
    return;
  }
  selectStudent(studentId);
});

studentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = {
    name: document.getElementById("studentName").value,
    weekday: document.getElementById("studentWeekday").value,
    startTime: document.getElementById("studentStart").value,
    durationMin: Number(document.getElementById("studentDuration").value),
    lessonsPerMonth: Number(document.getElementById("studentLessons").value),
  };

  const validationMessage = validateStudentForm(formData);
  if (validationMessage) {
    studentFormError.textContent = validationMessage;
    return;
  }

  const result = createStudent(formData);
  if (!result.ok) {
    studentFormError.textContent = result.message;
    return;
  }

  studentFormError.textContent = "";
  studentForm.reset();
  listStudents();
  renderTodayBookings();
  if (selectedStudentId) {
    renderSchedule(selectedDate);
  }
});

prevMonthButton.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  renderCalendar();
});

addBookingButton.addEventListener("click", () => {
  if (!selectedStudentId) {
    alert("生徒を選択してください。");
    return;
  }
  const student = students.find((item) => item.id === selectedStudentId);
  if (!student) {
    alert("生徒情報が見つかりません。");
    return;
  }

  const endTime = addMinutes(student.startTime, student.durationMin);
  const result = createBooking({
    studentId: selectedStudentId,
    date: selectedDate,
    startTime: student.startTime,
    endTime,
  });

  if (!result.ok) {
    alert(result.message);
    return;
  }

  renderCalendar();
  renderSchedule(selectedDate);
  renderTodayBookings();
});

deleteStudentButton.addEventListener("click", () => {
  if (!selectedStudentId) {
    alert("生徒を選択してください。");
    return;
  }
  const result = deleteStudent(selectedStudentId);
  if (!result.ok) {
    return;
  }
  listStudents();
  renderTodayBookings();
  if (students.length > 0) {
    selectStudent(students[0].id);
    return;
  }
  renderEmptyDetail();
});

function initializeApp() {
  listStudents();
  renderTodayBookings();
  if (students.length > 0) {
    selectStudent(students[0].id);
    return;
  }
  renderEmptyDetail();
}

initializeApp();
