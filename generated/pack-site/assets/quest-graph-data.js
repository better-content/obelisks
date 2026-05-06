window.QUEST_GRAPH = {
  "nodes": [
    {
      "id": "start_here",
      "kind": "quest",
      "label": "Start Here",
      "chapter": "start",
      "stage": "early",
      "url": "quests/start_here.html"
    },
    {
      "id": "automation_intro",
      "kind": "quest",
      "label": "Automation Intro",
      "chapter": "automation",
      "stage": "early",
      "url": "quests/automation_intro.html"
    },
    {
      "id": "ae2_orbit_ship_reminder",
      "kind": "quest",
      "label": "Ruined AE2 Ship In Orbit",
      "chapter": "post_ae2",
      "stage": "post_ae2",
      "url": "quests/ae2_orbit_ship_reminder.html"
    },
    {
      "id": "avatar_cloning_reminder",
      "kind": "quest",
      "label": "Avatar And Cloning Vats",
      "chapter": "post_ae2",
      "stage": "post_ae2",
      "url": "quests/avatar_cloning_reminder.html"
    },
    {
      "id": "spawn_ritual_reminder",
      "kind": "quest",
      "label": "Spawn Moving Ritual",
      "chapter": "post_ae2",
      "stage": "post_ae2",
      "url": "quests/spawn_ritual_reminder.html"
    }
  ],
  "edges": [
    {
      "source": "start_here",
      "target": "automation_intro",
      "kind": "requires"
    },
    {
      "source": "automation_intro",
      "target": "ae2_orbit_ship_reminder",
      "kind": "requires"
    },
    {
      "source": "automation_intro",
      "target": "avatar_cloning_reminder",
      "kind": "requires"
    },
    {
      "source": "automation_intro",
      "target": "spawn_ritual_reminder",
      "kind": "requires"
    }
  ]
};
