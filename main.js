document.addEventListener('DOMContentLoaded', () => {
  const searchDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  fetchSchedule('2025-6-19', 'th');
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

  // รวมหนังทั้งหมดจากทุกโรง
  const allSchedules = [];

  data.forEach(theater => {
    if (!theater.schedules || theater.schedules.length === 0) return;

    theater.schedules.forEach(schedule => {
      allSchedules.push({
        ...schedule,
        theater_name: theater.theater_name,
        theater_icon: theater.theater_icon_web_path,
      });
    });
  });

  // รวมตาม movie_id เพื่อไม่ให้หนังเดียวกันซ้ำแยกบรรทัด
  const movieMap = new Map();

  allSchedules.forEach(schedule => {
    const movie = schedule.movie;
    if (!movieMap.has(movie.movie_id)) {
      movieMap.set(movie.movie_id, {
        movie: movie,
        schedules: [],
      });
    }
    movieMap.get(movie.movie_id).schedules.push(schedule);
  });

  // สร้าง card สำหรับหนังแต่ละเรื่อง
  movieMap.forEach(({ movie, schedules }) => {
    const card = document.createElement('div');
    card.className = 'movie-card';

    // Movie Poster
    const image = document.createElement('img');
    image.src = movie.poster_web_path || 'default-image.png';
    image.alt = movie.title;
    card.appendChild(image);

    // Info Container
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

    info.appendChild(title);
    info.appendChild(language);
    info.appendChild(rating);
    info.appendChild(duration);
    card.appendChild(info);

    // Showtimes
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




