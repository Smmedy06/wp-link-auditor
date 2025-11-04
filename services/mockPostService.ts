
import { Post } from '../types';

const generateRandomContent = (id: number): string => {
  const links = [
    `<a href="/internal-page-${id}">Check out this internal page</a>`,
    `<a href="https://example.com" target="_blank" rel="external nofollow">An external nofollow link</a>`,
    `<a href="https://wikipedia.org/wiki/React_(JavaScript_library)" target="_blank" rel="external">Learn more about React</a> on Wikipedia.`,
    `Here is some content with an internal link to our <a href="/about-us">about page</a>. It's very informative.`,
    `For breaking news, visit <a href="https://news.example.dev" rel="external">Example News</a>, a trusted source.`,
    `A broken link for testing: <a href="https://thissitedoesnotexist.fail/page" target="_blank" rel="external">a broken link</a>.`,
    `Another paragraph with a link that is just an anchor: <a href="/contact">contact us</a>.`,
    `This link has no attributes: <a href="https://google.com" rel="external">Google</a>`,
  ];

  let content = `<p>This is the content for post ${id}. It contains several links to test the functionality of our link auditor.</p>`;
  for (let i = 0; i < 4; i++) {
    content += `<p>${links[Math.floor(Math.random() * links.length)]}</p>`;
  }
  return content;
};

const mockPosts: Post[] = Array.from({ length: 250 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (250 - i));
  
  const keyphrases = ['react tutorial for beginners', 'wordpress seo', 'link building strategies', 'best javascript frameworks', null];
  const focusKeyphrase = i % 5 === 0 ? keyphrases[Math.floor(Math.random() * 4)] : undefined;

  return {
    id: i + 1,
    title: `Sample Post Title ${i + 1}`,
    content: generateRandomContent(i + 1),
    date: date.toISOString(),
    focusKeyphrase,
  };
});

export const fetchPosts = async (): Promise<Post[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockPosts;
};