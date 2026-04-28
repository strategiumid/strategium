package com.strategium.news;

import com.strategium.auth.CurrentUserService;
import com.strategium.user.UserAccount;
import com.strategium.user.UserRole;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/news")
public class NewsController {

  private final NewsService newsService;
  private final CurrentUserService currentUserService;

  public NewsController(NewsService newsService, CurrentUserService currentUserService) {
    this.newsService = newsService;
    this.currentUserService = currentUserService;
  }

  @GetMapping
  public List<NewsItemResponse> findAll(@RequestParam(name = "q", required = false) String query) {
    return newsService.findAll(query);
  }

  @GetMapping("/{id}")
  public NewsItemResponse findById(@PathVariable UUID id) {
    return newsService.findById(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public NewsItemResponse create(@Valid @RequestBody NewsItemRequest request) {
    requireAdmin();
    return newsService.create(request);
  }

  @PutMapping("/{id}")
  public NewsItemResponse update(@PathVariable UUID id, @Valid @RequestBody NewsItemRequest request) {
    requireAdmin();
    return newsService.update(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    requireAdmin();
    newsService.delete(id);
  }

  private void requireAdmin() {
    UserAccount user = currentUserService.requireUser();
    if (user.getRole() != UserRole.ADMIN) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
    }
  }
}
