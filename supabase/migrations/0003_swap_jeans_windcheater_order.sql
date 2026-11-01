update products
set published_at = case slug
  when 'red-high-collar-jacket' then now() - interval '1 second'
  when 'light-grey-check-jacket' then now() - interval '2 seconds'
  when 'black-off-white-windcheater' then now() - interval '3 seconds'
  when 'classic-blue-jeans' then now() - interval '4 seconds'
end
where slug in (
  'red-high-collar-jacket',
  'light-grey-check-jacket',
  'classic-blue-jeans',
  'black-off-white-windcheater'
);
