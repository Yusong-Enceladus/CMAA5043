import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { newsData } from '../data/newsData';

/**
 * LatestNews – Tutorial component demonstrating list → detail routing
 *
 * Lab 7 Assignment 1: Added real-time clock that fetches time from
 * http://quan.suning.com/getSysTime.do every second.
 * Falls back to local time with "(local time)" label on error.
 */

function LatestNews() {
  // --- Assignment 1: Real-time clock state ---
  const [currentTime, setCurrentTime] = useState('');
  const [isLocalTime, setIsLocalTime] = useState(false);

  useEffect(() => {
    // fetchTime: tries remote API first, falls back to local time on error
    const fetchTime = async () => {
      try {
        const response = await fetch('http://quan.suning.com/getSysTime.do');
        const data = await response.json();
        // API returns { sysTime2: "2020-08-07 16:33:25", sysTime1: "20200807163325" }
        setCurrentTime(data.sysTime2);
        setIsLocalTime(false);
      } catch (error) {
        // Error handling: use local time if API fails
        const now = new Date();
        const localStr = now.toLocaleString('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false
        });
        setCurrentTime(localStr);
        setIsLocalTime(true);
      }
    };

    // Fetch immediately on mount
    fetchTime();
    // Update every second using setInterval
    const timer = setInterval(fetchTime, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="news-main">
      <section className="page-header">
        <h2>Latest News</h2>
        {/* Assignment 1: Display real-time clock */}
        <p className="real-time-clock" style={{
          fontSize: '1.1rem', fontWeight: 'bold',
          padding: '8px 16px', background: '#f0f4ff',
          borderRadius: '8px', display: 'inline-block', marginBottom: '12px'
        }}>
          🕐 {currentTime} {isLocalTime && <span style={{ color: '#e74c3c' }}>(local time)</span>}
        </p>
        <p>Click any article to read the full story.</p>
      </section>

      <ul className="news-list">
        {newsData.map((article) => (
          <li key={article.id} className="news-item">
            <Link to={`/news/${article.id}`} className="news-link">
              <span className="news-category">{article.category}</span>
              <h3>{article.title}</h3>
              <span className="news-date">{article.date}</span>
              <p>{article.summary}</p>
              <span className="read-more">Read more →</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default LatestNews;
