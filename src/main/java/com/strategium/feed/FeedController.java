package com.strategium.feed;

import com.strategium.auth.CurrentUserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feed")
public class FeedController {

  private final VkFeedService vkFeedService;
  private final CurrentUserService currentUserService;
  private final VkPostActionService vkPostActionService;

  public FeedController(
      VkFeedService vkFeedService,
      CurrentUserService currentUserService,
      VkPostActionService vkPostActionService
  ) {
    this.vkFeedService = vkFeedService;
    this.currentUserService = currentUserService;
    this.vkPostActionService = vkPostActionService;
  }

  @GetMapping("/vk/strategium")
  public List<VkPostResponse> strategiumVkFeed() {
    return vkFeedService.loadStrategiumPosts();
  }

  @PostMapping("/vk/posts/{postId}/like")
  public VkPostActionResponse like(@PathVariable String postId) {
    return vkPostActionService.like(currentUserService.requireUser(), postId);
  }

  @PostMapping("/vk/posts/{postId}/comments")
  public VkPostActionResponse comment(@PathVariable String postId, @Valid @RequestBody VkCommentRequest request) {
    return vkPostActionService.comment(currentUserService.requireUser(), postId, request.message());
  }
}
