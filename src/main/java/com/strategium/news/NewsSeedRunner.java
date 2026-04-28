package com.strategium.news;

import java.time.LocalDate;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class NewsSeedRunner implements ApplicationRunner {

  private final NewsItemRepository newsItemRepository;

  public NewsSeedRunner(NewsItemRepository newsItemRepository) {
    this.newsItemRepository = newsItemRepository;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (newsItemRepository.count() > 0) {
      return;
    }

    newsItemRepository.saveAll(List.of(
        new NewsItem(
            "Cities: Skylines II — Patch Notes 1.2.5f1",
            "Обновление улучшает производительность в поздней стадии города, исправляет транспортные маршруты и повышает стабильность сохранений.",
            "new",
            "Paradox Interactive",
            "https://www.paradoxinteractive.com/games/cities-skylines-ii/news",
            LocalDate.parse("2026-04-22")
        ),
        new NewsItem(
            "Crusader Kings III — Development Diary",
            "Разработчики рассказали о следующих механиках дипломатии, изменениях ИИ и планах по контенту для крупных династических кампаний.",
            "news",
            "Paradox Forum",
            "https://forum.paradoxplaza.com/forum/forums/crusader-kings-iii.1059/",
            LocalDate.parse("2026-04-16")
        ),
        new NewsItem(
            "Stellaris — Open Beta Changelog",
            "Новый пакет балансных правок по экономикам империй, улучшения интерфейса флота и обновленные модификаторы событий.",
            "important",
            "Paradox Forum",
            "https://forum.paradoxplaza.com/forum/forums/stellaris.900/",
            LocalDate.parse("2026-04-09")
        ),
        new NewsItem(
            "Hearts of Iron IV — Patch and Roadmap Notes",
            "Команда HOI4 опубликовала заметки о патче, исправлениях синхронизации в мультиплеере и приоритетах дорожной карты.",
            "dev",
            "Paradox Forum",
            "https://forum.paradoxplaza.com/forum/forums/hearts-of-iron-iv.844/",
            LocalDate.parse("2026-04-02")
        ),
        new NewsItem(
            "Europa Universalis IV — Update Overview",
            "Обзор обновления с изменениями торговли, дипломатических действий и поведения ИИ в колониальных регионах.",
            "release",
            "Paradox Forum",
            "https://forum.paradoxplaza.com/forum/forums/europa-universalis-iv.731/",
            LocalDate.parse("2026-03-30")
        ),
        new NewsItem(
            "Victoria 3 — Community Report",
            "Команда Victoria 3 представила отчёт по фидбеку игроков, изменению баланса отраслей и дальнейшим приоритетам.",
            "recap",
            "Paradox Forum",
            "https://forum.paradoxplaza.com/forum/forums/victoria-3.1091/",
            LocalDate.parse("2026-03-19")
        )
    ));
  }
}
