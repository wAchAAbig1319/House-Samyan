document.addEventListener('DOMContentLoaded', () => {
  const searchDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  fetchSchedule(searchDate, 'th');
});

function fetchSchedule(date, language) {
  fetch('/api/schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      search_date: date,
      language: language
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(response => {
      console.log('✅ Response data:', response);
      renderSchedule(response.data);
    })
    .catch(error => {
      console.error('💥 Error:', error);
    });
}

function renderSchedule(data) {
  const movieList = document.getElementById('movieList');
  movieList.innerHTML = '';

  const now = new Date();
  const allMovies = [];

  data.forEach(theater => {
    if (!theater.schedules) return;

    theater.schedules.forEach(schedule => {
      const movie = schedule.movie;
      if (!movie) return;

      allMovies.push({
        movie: movie,
        schedule: schedule,
        theater_name: theater.theater_name,
        theater_icon: theater.theater_icon_web_path
      });
    });
  });

  // รวมหนังตาม movie_id เพื่อไม่ให้หนังซ้ำ
  const movieMap = new Map();

  allMovies.forEach(entry => {
    const movie = entry.movie;
    const movieId = movie.movie_id;
    if (!movieMap.has(movieId)) {
      movieMap.set(movieId, {
        movie: movie,
        schedules: [],
        theater_name: entry.theater_name,
        theater_icon: entry.theater_icon
      });
    }
    movieMap.get(movieId).schedules.push(entry.schedule);
  });

  // แปลง Map เป็น Array แล้ว sort ตาม start_release_date
const sortedMovies = Array.from(movieMap.values()).sort((a, b) => {
  const dateA = new Date(a.movie.start_release_date);
  const dateB = new Date(b.movie.start_release_date);
  return dateB - dateA; // เรียงจากล่าสุดไปเก่าสุด
});


  // แสดงผล
  sortedMovies.forEach(({ movie, schedules, theater_name, theater_icon }) => {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const image = document.createElement('img');
    image.src = movie.poster_web_path || 'default-image.png';
    image.alt = movie.title;
    card.appendChild(image);

    const info = document.createElement('div');
    info.className = 'movie-info';

    const title = document.createElement('div');
    title.className = 'movie-title';
    title.textContent = movie.title;

    const language = document.createElement('div');
    language.className = 'movie-subinfo';
    language.textContent = formatLanguage(movie.language, movie.subtitle);

    const rating = document.createElement('div');
    rating.className = 'movie-subinfo';
    rating.textContent = `[${movie.rate_name || '-'}]`;

    const duration = document.createElement('div');
    duration.className = 'movie-subinfo';
    duration.textContent = formatDuration(movie.show_time);

    const releaseDate = document.createElement('div');
    releaseDate.className = 'movie-subinfo';
    info.appendChild(title);
    info.appendChild(language);
    info.appendChild(rating);
    info.appendChild(duration);
    card.appendChild(info);

    const showtimesContainer = document.createElement('div');
    showtimesContainer.className = 'showtimes';

    const scheduleTimes = schedules.map(s => {
      const time = new Date(s.start_time);
      return {
        time,
        formattedTime: time.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      };
    }).sort((a, b) => a.time - b.time);

    const upcomingIndex = scheduleTimes.findIndex(s => s.time > now);

    scheduleTimes.forEach((schedule, index) => {
      const timeButton = document.createElement('button');
      timeButton.className = 'time-btn';

      if (schedule.time < now) {
        timeButton.classList.add('past');
      } else if (index === upcomingIndex) {
        timeButton.classList.add('next');
      } else {
        timeButton.classList.add('future');
      }

      timeButton.textContent = schedule.formattedTime;
      showtimesContainer.appendChild(timeButton);
    });

    card.appendChild(showtimesContainer);
    movieList.appendChild(card);
  });
}


function formatLanguage(sound) {
  if (!sound) return '[-]';

const langMap = {
  ENGLISH: 'EN',
  ENG: 'EN',
  EN: 'EN',
  THAI: 'TH',
  TH: 'TH',
  FRENCH: 'FR',
  FRA: 'FR',
  FR: 'FR',
  JAPANESE: 'JP',
  JAP: 'JP',
  JP: 'JP',
  CHINESE: 'ZH',
  CHI: 'ZH',
  ZH: 'ZH',
  KOREAN: 'KR',
  KOR: 'KR',
  KR: 'KR',
  GERMAN: 'DE',
  GER: 'DE',
  DE: 'DE'
  // เพิ่มได้อีกถ้าต้องการ
};

  const toAbbreviations = (text) => {
    return text
      .toUpperCase()
      .replace(/SUBS?/g, '')
      .replace(/TITLES?/g, '')
      .split(/[\s,\/&]+|AND/i)
      .map(word => langMap[word.trim()] || word.trim())
      .filter(Boolean);
  };

  const cleanSound = sound.trim().toUpperCase();

  // รูปแบบ A (B)
  const match = cleanSound.match(/^([A-Z\s]+?)\s*\((.*?)\)$/);
  if (match) {
    const main = toAbbreviations(match[1])[0];
    const subs = toAbbreviations(match[2]);
    if (subs.length === 0) return `[${main}]`;
    if (subs.length === 1) return `[${main}/${subs[0]}]`;
    return `[${main}/${subs.join('&')}]`;
  }

  // รูปแบบ A with B (ไม่มีวงเล็บ)
  const withParts = cleanSound.split(/\bWITH\b/i);
  if (withParts.length === 2) {
    const main = toAbbreviations(withParts[0])[0];
    const subs = toAbbreviations(withParts[1]);
    if (subs.length === 0) return `[${main}]`;
    if (subs.length === 1) return `[${main}/${subs[0]}]`;
    return `[${main}/${subs.join('&')}]`;
  }

  // fallback เผื่อแย่สุด
  const allParts = toAbbreviations(cleanSound);
  if (allParts.length === 1) return `[${allParts[0]}]`;
  return `[${allParts[0]}/${allParts.slice(1).join('&')}]`;
}


function formatDuration(minutesStr) {
  const minutes = parseInt(minutesStr || '0', 10);
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${minutes} MINS (${hrs}:${mins.toString().padStart(2, '0')} HRS)`;
}

document.addEventListener('DOMContentLoaded', () => {
  const searchDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  fetchSchedule(searchDate, 'th');
  fetchBanner(); // ✅ เพิ่มฟังก์ชันโหลดแบนเนอร์
});

function fetchBanner() {
  fetch('/api/banner', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({}) // ไม่ต้องส่งอะไร เพราะ server จะส่ง language="th" ให้อยู่แล้ว
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch banner');
      return response.json();
    })
    .then(data => {
      console.log('🖼️ Banner data:', data);
      renderBanners(data.data || []); // หาก key เป็น data
    })
    .catch(err => {
      console.error('💥 Banner error:', err);
    });
}

function renderBanners(banners) {
  const slideTrack = document.querySelector('.slide-track');
  if (!slideTrack) return;

  slideTrack.innerHTML = ''; // เคลียร์ของเก่า

  banners.forEach((banner, index) => {
    const a = document.createElement('a');
    a.href = banner.banner_link_url || '#';
    a.target = '_blank';

    const img = document.createElement('img');
    img.src = banner.image_web_path;
    img.alt = banner.banner_title || 'Banner';
    img.className = 'slide-img';
    if (index === 0) img.classList.add('active'); // รูปแรก active

    a.appendChild(img);
    slideTrack.appendChild(a);
  });

  // เริ่ม slide ทุก 10 วินาที
  let current = 0;
  const slides = document.querySelectorAll('.slide-img');

  setInterval(() => {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }, 10000); // 10,000 ms = 10 วิ
}


