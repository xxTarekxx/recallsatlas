package search;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * RecallsAtlas search microservice – skeleton.
 * GET /search?q=query → JSON with title, slug per hit.
 * Index directory: ./lucene-index (create and populate via ingestion later).
 */
public class SearchService {

    private static final String INDEX_PATH = System.getenv().getOrDefault("LUCENE_INDEX_PATH", "./lucene-index");
    private static final int DEFAULT_PORT = 8081;
    private static final Gson GSON = new Gson();

    public static void main(String[] args) throws Exception {
        Server server = new Server(DEFAULT_PORT);
        ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
        context.setContextPath("/");
        context.addServlet(new ServletHolder(new SearchServlet()), "/search");
        server.setHandler(context);
        server.start();
        server.join();
    }

    public static class SearchServlet extends HttpServlet {

        @Override
        protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
            resp.setContentType("application/json");
            resp.setCharacterEncoding(StandardCharsets.UTF_8.name());

            String q = req.getParameter("q");
            if (q == null || q.isBlank()) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                JsonObject err = new JsonObject();
                err.addProperty("error", "Missing query parameter: q");
                resp.getWriter().write(GSON.toJson(err));
                return;
            }

            List<SearchResult> results = search(q);
            JsonArray arr = new JsonArray();
            for (SearchResult r : results) {
                JsonObject obj = new JsonObject();
                obj.addProperty("title", r.title);
                obj.addProperty("slug", r.slug);
                arr.add(obj);
            }

            resp.getWriter().write(arr.toString());
        }
    }

    public static List<SearchResult> search(String query) {
        List<SearchResult> out = new ArrayList<>();
        Path indexDir = Path.of(INDEX_PATH);

        if (!indexDir.toFile().exists()) {
            return out;
        }

        try (Directory dir = FSDirectory.open(indexDir);
             IndexReader reader = DirectoryReader.open(dir)) {

            IndexSearcher searcher = new IndexSearcher(reader);
            QueryParser parser = new QueryParser("title", new StandardAnalyzer());
            Query q = parser.parse(QueryParser.escape(query));
            TopDocs docs = searcher.search(q, 50);

            for (ScoreDoc sd : docs.scoreDocs) {
                Document doc = searcher.doc(sd.doc);
                String title = doc.get("title");
                String slug = doc.get("slug");
                if (title != null && slug != null) {
                    out.add(new SearchResult(title, slug));
                }
            }
        } catch (ParseException | IOException e) {
            // Return empty on parse/IO errors in skeleton
        }

        return out;
    }

    public record SearchResult(String title, String slug) {}
}
