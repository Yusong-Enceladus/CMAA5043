import { useParams, Link } from 'react-router-dom';
import { newsData } from '../data/newsData';

/**
 * NewsDetail – individual article page
 *
 * useParams() reads the :id from the URL (/news/2 → id = "2").
 * This is the same pattern used by ProjectDetail in the portfolio,
 * and by the GalleryPage routing in the exercise (Assignment 3).
 */
function NewsDetail() {
  const { id } = useParams();
  // newsData is keyed by number, URL param is a string — convert with parseInt
  const article = newsData.find((n) => n.id === parseInt(id));

  if (!article) {
    return (
      <main className="news-detail-main">
        <Link to="/news" className="back-link">← Back to News</Link>
        <h2>Article not found</h2>
      </main>
    );
  }

  return (
    <main className="news-detail-main">
      <Link to="/news" className="back-link">← Back to Latest News</Link>

      <article className="article-content">
        <span className="news-category">{article.category}</span>
        <h2>{article.title}</h2>
        <p className="article-date">{article.date}</p>
        <p className="article-body">{article.content}</p>
      </article>
    </main>
  );
}

export default NewsDetail;
