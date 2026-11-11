import Image from "next/image";
import Link from "next/link";
import { HeroApila } from "@/components/avatar/HeroApila";
import { PrivacyPlanet } from "@/components/planet/PrivacyPlanet";

const flower = (slug: string) => `/assets/flowers/${slug}.png`;

const groundFlowers = [
  "bulb-flowers-01-tulip",
  "wildflower-cornflower",
  "aquatic-09-pink-lotus",
  "wildflower-california-poppy",
  "oxalis-03-purple-shamrock",
  "wildflower-common-foxglove",
  "succulents-02-echeveria",
];

const features = [
  {
    title: "Plans become flowers",
    body: "Schedule a call, a walk or a hangout with a friend. When you connect, it blooms in your shared garden and your calendar.",
    icon: flower("bulb-flowers-01-tulip"),
    tint: "b-grass",
  },
  {
    title: "Visit friends' planets",
    body: "Every friend has their own little planet. Drop by, see what's blooming, and grow friendship trees together with notes on their branches.",
    icon: "/assets/hearts.png",
    tint: "b-blush",
  },
  {
    title: "Build your world",
    body: "Shape your land with hills, ponds, lakes and volcanoes. Paint the ground, and place plants and decorations anywhere.",
    icon: flower("aquatic-10-blue-water-lily"),
    tint: "b-sky",
  },
  {
    title: "Focus and collect",
    body: "Start a focus timer and earn a gift when it ends. Discover more than 120 plants, from orchids to carnivorous pitchers.",
    icon: flower("wildflower-california-poppy"),
    tint: "b-sun",
  },
  {
    title: "A journal for each garden",
    body: "Write entries in your garden or a friend's, add photos, and look back on the days you spent together.",
    icon: flower("begonia-escargot"),
    tint: "b-soil",
  },
  {
    title: "Walks and duets",
    body: "Go on walks with Apila and see your steps from Apple Health. Play voice-controlled duet games live with a friend.",
    icon: "/assets/apila-front.png",
    tint: "b-bell",
  },
];

const plants = [
  ["bulb-flowers-01-tulip", "Tulip"],
  ["aquatic-09-pink-lotus", "Pink Lotus"],
  ["orchids-06-blue-vanda", "Blue Vanda"],
  ["carnivorous-01-venus-flytrap", "Venus Flytrap"],
  ["begonia-escargot", "Escargot Begonia"],
  ["mushrooms-pink-oyster", "Pink Oyster"],
  ["wildflower-cornflower", "Cornflower"],
  ["succulents-02-echeveria", "Echeveria"],
  ["aquatic-10-blue-water-lily", "Blue Water Lily"],
  ["oxalis-03-purple-shamrock", "Purple Shamrock"],
  ["wildflower-common-foxglove", "Foxglove"],
  ["wildflower-california-poppy", "California Poppy"],
];

// The six Flower Friends, rendered from the app's wardrobe (327×560 each, shared framing).
const cast = [
  { id: "apila", name: "Apila", flower: "Clover" },
  { id: "mogun", name: "Mogun", flower: "Mushroom" },
  { id: "ruusu", name: "Ruusu", flower: "Rose" },
  { id: "najma", name: "Najma", flower: "Stars" },
  { id: "sola", name: "Sola", flower: "Sun" },
  { id: "padma", name: "Padma", flower: "Lotus" },
];

const privacyPoints = [
  ["No ads, no tracking, no selling data.", "We only use your data to run Apila."],
  ["Walks and steps stay on your phone.", "Your location, routes and Apple Health data are never sent to us."],
  ["Your voice is never recorded.", "In duet games it goes live to your friend and nowhere else."],
  ["Delete everything, anytime.", "Settings → Delete account removes your account and garden for good."],
];

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.31-.89-2.32-3.54zM14.2 6.13c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.59-2.57 1.32-.56.65-1.06 1.69-.92 2.69.98.08 1.98-.5 2.58-1.23z" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <div className="hero">
        <div className="wrap">
          <div>
            <span className="eyebrow pixel">Flower Friends</span>
            <h1>
              A garden you grow with the <span>people you love.</span>
            </h1>
            <p className="lede">
              Plan a call, a walk or a hangout and it&apos;s planted as a seed. Meet up, and it blooms on your little
              planet, and on your friend&apos;s too.
            </p>
            <div className="cta-row">
              {/* Replace with the App Store link once the app is live. */}
              <span className="btn btn-primary">
                <AppleLogo />
                Coming soon to the App Store
              </span>
              <Link className="btn btn-ghost" href="#features">
                See what&apos;s inside
              </Link>
            </div>
            <p className="soon">For iPhone.</p>
          </div>
          <div className="hero-art">
            <Image className="icon" src="/assets/icon-large.png" alt="" width={720} height={720} sizes="(max-width: 860px) 270px, 360px" priority />
            <HeroApila />
            <Image className="hearts" src="/assets/hearts.png" alt="" width={256} height={256} />
          </div>
        </div>
        <div className="ground" aria-hidden="true">
          <div className="flower-row">
            {groundFlowers.map((slug) => (
              <Image key={slug} src={flower(slug)} alt="" width={86} height={86} />
            ))}
          </div>
          <div className="walker" />
        </div>
      </div>

      <section id="features">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker pixel">What you can do</span>
            <h2>Tend friendships like a garden.</h2>
            <p>Apila turns the small ways you show up for each other into something you can see grow.</p>
          </div>
          <div className="features">
            {features.map((f) => (
              <article className="card" key={f.title}>
                <div className={`badge ${f.tint}`}>
                  <Image src={f.icon} alt="" width={46} height={46} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wardrobe">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker pixel">The wardrobe</span>
            <h2>Dress up your Apila.</h2>
            <p>
              Mix hair, buds, hairpins, eyes, scarves, dresses and pendants. Here are six of our favourite flower
              friends. Your friends see your Apila when they visit your planet.
            </p>
          </div>
          <ul className="lineup">
            {cast.map((c) => (
              <li key={c.id}>
                <Image
                  src={`/assets/cast/${c.id}.png`}
                  alt={`${c.name}, the ${c.flower.toLowerCase()} friend`}
                  width={327}
                  height={560}
                  sizes="(max-width: 560px) 30vw, 170px"
                />
                <strong>{c.name}</strong>
                <span className="pixel">{c.flower}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="collection">
        <div className="wrap">
          <div className="section-head">
            <span className="kicker pixel">The collection</span>
            <h2>Over 120 plants to discover.</h2>
            <p>Wildflowers, bulbs, orchids, mosses, mushrooms, cacti and more, each with its real botanical name.</p>
          </div>
          <div className="plant-grid">
            {plants.map(([slug, name]) => (
              <div className="plant" key={slug}>
                <Image src={flower(slug)} alt="" width={216} height={216} sizes="(max-width: 560px) 30vw, 160px" />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="privacy">
        <div className="wrap privacy-glance">
          <div className="glance-art">
            <PrivacyPlanet />
          </div>
          <div>
            <div className="section-head" style={{ marginBottom: 24 }}>
              <span className="kicker pixel">Privacy at a glance</span>
              <h2>Your garden, not an ad network.</h2>
            </div>
            <ul className="glance-list">
              {privacyPoints.map(([title, body]) => (
                <li key={title}>
                  <span className="dot">✓</span>
                  <div>
                    <strong>{title}</strong>
                    <span>{body}</span>
                  </div>
                </li>
              ))}
            </ul>
            <Link className="btn btn-ghost" href="/privacy">
              Read the privacy policy
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
