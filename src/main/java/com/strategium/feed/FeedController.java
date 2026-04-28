package com.strategium.feed;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feed")
public class FeedController {

  private final VkFeedService vkFeedService;

  public FeedController(VkFeedService vkFeedService) {
    this.vkFeedService = vkFeedService;
  }

  @GetMapping("/vk/strategium")
  public List<VkPostResponse> strategiumVkFeed() {
    return vkFeedService.loadStrategiumPosts();
  }
}
