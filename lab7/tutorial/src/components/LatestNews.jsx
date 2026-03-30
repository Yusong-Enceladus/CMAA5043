import { Link } from 'react-router-dom';
import { newsData } from '../data/newsData';

/**
 * LatestNews – Tutorial component demonstrating list → detail routing
 *
 * This component mirrors the pattern used in Lab 3's ProjectDetail:
 * a list of items rendered with .map(), each linking to a detail page
 * via React Router's <Link> component.
 *
 * In Assignment 3 of the exercise, the Gallery page follows this same
 * routing pattern: a /gallery route renders the Gallery component,
 * accessible from the nav just like /news is here.
 */

function LatestNews() {
  return (
    <main className="news-main">
      <section className="page-header">
        <h2>Latest News</h2>
        <p>Click any article to read the full story. This list → detail routing pattern is used for the Gallery page in the exercise.</p>
      </section>

      <ul className="news-list">
        {newsData.map((article) => (
          <li key={article.id} className="news-item">
            {/* Link navigates to /news/:id — mirrors how /gallery is structured */}
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
