export const products = [
 {id:'rope',name:'The Tug Club Rope',cat:'Toys',price:14,variant:['Classic'],detail:'A braided rope for the dog who brings a toy to every conversation. Made for shared play, then a well-earned nap.'},
 {id:'bowl',name:'Sunday Ceramic Bowl',cat:'Feeding',price:24,variant:['Small','Large'],detail:'A simple ceramic bowl for slow mornings and eagerly anticipated dinners. Choose the size that suits your dog’s daily routine.'},
 {id:'harness',name:'Everyday Walk Harness',cat:'Walks',price:32,variant:['Small','Medium','Large'],detail:'A sage walking harness with adjustable straps for your neighborhood wanderer. Choose a size before adding it to your bag.'},
 {id:'bag',name:'Beagle Club Tote',cat:'Grapes & Lucy',price:22,variant:['Natural'],detail:'An everyday canvas carryall for dog people. Pack a book, a spare lead and something for the walk home.'},
 {id:'mug',name:'Morning Beagle Mug',cat:'Grapes & Lucy',price:18,variant:['Classic'],detail:'A little beagle company for your morning coffee. Part of the Grapes & Lucy collection for the humans on the other end of the lead.'},
 {id:'tee',name:'Beagle Club Tee',cat:'Grapes & Lucy',price:29,variant:['S','M','L','XL'],detail:'An easygoing graphic tee inspired by Grapes and Lucy. Pick your size and wear your love for long ears on your sleeve.'}
];
export const firstArticle = {id:'sniff-walk',title:'Let them take the scenic sniff.',category:'Beagle life',photo:'/photos/journal.jpg',body:'Some walks start with a destination. With Grapes, they usually start with one particular patch of grass. Lucy stops a few steps ahead, looks back, and decides it deserves a second opinion.\n\nFor our next walk, we tried leaving the route open. We picked a familiar, quiet stretch and let the dogs choose where to pause. A short loop suddenly had a dozen interesting stops.\n\nTry picking one part of your usual route where the clock can wait. Give your dog a moment to investigate, then carry on together. Sometimes the best part of the walk is the bit you usually hurry past.'};

export type Product = (typeof products)[number] & {
  photo: string;
  aliexpressUrl?: string;
  buyMode?: 'store' | 'aliexpress';
};
export const starterCatalog: Product[] = products.map(product => ({
  ...product, photo: '/photos/' + product.id + '.jpg'
}));
