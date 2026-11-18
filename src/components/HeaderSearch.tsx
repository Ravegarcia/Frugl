import SearchBox from '@/components/SearchBox';

export default function HeaderSearch() {
  return (
    <div className='min-w-0 max-w-[36rem] flex-[1_1_18rem] max-md:order-last max-md:w-full max-md:max-w-none max-md:flex-[1_1_100%]'>
      <SearchBox />
    </div>
  );
}
