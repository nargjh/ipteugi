/* 핵심 표현 사전 — "표현|뜻|난이도(1 초급·2 중급·3 고급)|상황"
   A = 사람·물건이 들어가는 자리(낱말 1~3개) · one's = my/your/his/her/their/our
   상황: 일상·여행·식당·공항·호텔·쇼핑·길·감정·회사 (추천·필터에 씀) */
window.EXPR_RAW = `
get home|집에 도착하다|1|일상
go home|집에 가다|1|일상
come back|돌아오다|1|일상
get up|일어나다|1|일상
wake up|잠에서 깨다|1|일상
go to bed|자러 가다|1|일상
take a shower|샤워하다|1|일상
take a nap|낮잠 자다|1|일상
have breakfast|아침을 먹다|1|일상
grab a bite|간단히 뭐 좀 먹다|2|식당
grab a coffee|커피 한잔하다|1|식당
hang out|어울려 놀다|1|일상
catch up|밀린 이야기를 나누다, 따라잡다|2|일상
come over|(우리 집에) 놀러 오다|1|일상
stop by|잠깐 들르다|2|일상
drop by|잠깐 들르다|2|일상
show up|나타나다, 오다|2|일상
run late|늦어지다|2|일상
on my way|가는 중이에요|1|일상
on the way|가는 길에|1|길
be right back|금방 올게요|1|일상
hold on|잠깐만요|1|일상
hang on|잠깐만요, 버텨|1|일상
wait a minute|잠깐만|1|일상
give me a second|잠깐만 시간 줘|1|일상
take your time|천천히 하세요|1|일상
no worries|괜찮아요, 걱정 마요|1|감정
no problem|문제없어요, 천만에요|1|일상
my bad|내 잘못이야|1|감정
my pleasure|별말씀을요(기꺼이)|1|일상
you're welcome|천만에요|1|일상
thank you so much|정말 고마워요|1|일상
i appreciate it|고마워요(정중)|1|일상
excuse me|실례합니다, 저기요|1|여행
i'm sorry|미안해요|1|감정
sorry to bother you|귀찮게 해서 죄송해요|2|여행
nice to meet you|만나서 반가워요|1|일상
how's it going|잘 지내?|1|일상
what's up|뭐 해? 별일 없어?|1|일상
how are you doing|잘 지내요?|1|일상
long time no see|오랜만이야|1|일상
see you later|나중에 봐|1|일상
see you soon|곧 봐|1|일상
take care|잘 지내, 몸조심해|1|일상
have a good one|좋은 하루 보내요|1|일상
have a nice day|좋은 하루 되세요|1|일상
good for you|잘됐다|1|감정
you bet|물론이지|2|일상
sounds good|좋아요|1|일상
sounds great|아주 좋아요|1|일상
that makes sense|말이 되네요, 이해돼요|1|일상
makes sense|말이 되네|1|일상
i got it|알겠어요|1|일상
got it|알았어|1|일상
i see|그렇군요|1|일상
for sure|확실히, 물론|1|일상
of course|물론이죠|1|일상
no way|말도 안 돼|1|감정
come on|에이, 제발, 어서|1|감정
oh my god|세상에|1|감정
i can't believe|믿을 수가 없어|1|감정
are you kidding|농담하는 거지?|1|감정
just kidding|농담이야|1|감정
i'm just saying|그냥 하는 말이야|2|일상
i mean|내 말은|1|일상
you know what|있잖아|1|일상
by the way|그런데, 참고로|1|일상
anyway|어쨌든|1|일상
to be honest|솔직히 말하면|1|일상
in fact|사실은|2|일상
at least|적어도|1|일상
at all|전혀|1|일상
right now|지금 당장|1|일상
for a while|잠시 동안|1|일상
all the time|항상|1|일상
from time to time|가끔|2|일상
once in a while|가끔|2|일상
these days|요즘|1|일상
so far|지금까지|1|일상
as soon as possible|가능한 한 빨리|1|회사
as soon as|~하자마자|2|일상
a lot of|많은|1|일상
a little bit|조금|1|일상
kind of|좀, 약간|1|일상
sort of|약간, 어느 정도|2|일상
a couple of|두어 개의|1|일상
more or less|대략|2|일상
no big deal|별거 아니야|1|감정
big deal|큰일, 대단한 것|2|감정
what's the big deal|뭐가 그렇게 대수야|2|감정
it's up to you|너한테 달렸어, 네 맘대로|1|일상
up to you|너 하기 나름|1|일상
it depends|상황에 따라 달라|1|일상
depend on|~에 달려 있다|2|일상
it's not a big deal|별일 아니야|1|감정
never mind|신경 쓰지 마|1|일상
don't worry about it|걱정하지 마|1|감정
calm down|진정해|1|감정
cheer up|힘내|1|감정
freak out|기겁하다, 멘붕 오다|2|감정
chill out|진정해, 쉬다|2|감정
get mad|화나다|1|감정
get upset|속상해하다|1|감정
be into|~에 빠져 있다, 좋아하다|2|감정
be fond of|~을 좋아하다|2|감정
can't stand|못 참다, 아주 싫다|2|감정
look forward to|~을 기대하다|2|감정
miss you|보고 싶어|1|감정
feel like|~하고 싶다, ~같은 기분|1|감정
in the mood for|~할 기분이다|2|감정
get used to|~에 익숙해지다|2|일상
used to|예전엔 ~했다|2|일상
be about to|막 ~하려던 참이다|2|일상
have to|~해야 한다|1|일상
need to|~해야 해|1|일상
want to|~하고 싶다|1|일상
would like to|~하고 싶어요(정중)|1|여행
i'd like|~주세요, ~하고 싶어요|1|여행
can i get|~주시겠어요?|1|식당
could i have|~주실 수 있나요?|1|식당
can i have|~주세요|1|식당
how about|~는 어때?|1|일상
what about|~는 어때?, ~는 어쩌고?|1|일상
why don't we|우리 ~하는 게 어때?|1|일상
let's go|가자|1|일상
let me know|알려 줘|1|일상
let me see|어디 보자|1|일상
let me think|생각 좀 해 볼게|1|일상
i'm not sure|잘 모르겠어요|1|일상
i have no idea|전혀 모르겠어|1|일상
no idea|모르겠어|1|일상
figure out|알아내다, 해결하다|2|일상
find out|알아내다|1|일상
work out|운동하다, 잘 풀리다|2|일상
turn out|~로 드러나다|2|일상
end up|결국 ~하게 되다|2|일상
come up with|생각해 내다|2|회사
give up|포기하다|1|일상
keep going|계속해|1|일상
keep in touch|연락하고 지내자|1|일상
get in touch|연락하다|2|일상
reach out|연락하다, 손 내밀다|2|회사
call back|다시 전화하다|1|일상
pick up|줍다, 데리러 가다, 받다|1|일상
pick A up|A를 데리러 가다, 집어 들다|1|일상
drop off|내려 주다, 갖다 놓다|1|길
drop A off|A를 내려 주다|1|길
take off|이륙하다, 벗다|1|공항
put on|입다, 걸치다|1|쇼핑
try on|입어 보다|1|쇼핑
try A on|A를 입어 보다|1|쇼핑
turn on|켜다|1|일상
turn off|끄다|1|일상
turn A on|A를 켜다|1|일상
turn A off|A를 끄다|1|일상
look for|찾다|1|쇼핑
look at|보다|1|일상
look like|~처럼 보이다|1|일상
look up|찾아보다|2|일상
look after|돌보다|2|일상
take care of|돌보다, 처리하다|1|일상
deal with|처리하다, 감당하다|2|일상
get along|잘 지내다|2|일상
get over|극복하다|2|감정
get rid of|없애다, 처리하다|2|일상
get back|돌아오다, 되찾다|1|일상
get off|내리다|1|길
get on|타다|1|길
get in|(차에) 타다, 들어가다|1|길
get out|나가다, 내리다|1|길
get ready|준비하다|1|일상
get lost|길을 잃다|1|길
run out of|~이 다 떨어지다|2|일상
fill out|작성하다(서류)|1|공항
fill in|채우다, 작성하다|1|공항
sign up|가입하다, 등록하다|1|일상
log in|로그인하다|1|일상
set up|설치하다, 준비하다|2|회사
show up|나타나다|2|일상
hang up|전화를 끊다|1|일상
put off|미루다|2|회사
call off|취소하다|2|회사
check in|체크인하다|1|호텔
check out|체크아웃하다, 확인해 보다|1|호텔
check it out|확인해 봐|1|일상
check-in|체크인|1|호텔
check-out|체크아웃|1|호텔
make a reservation|예약하다|1|호텔
have a reservation|예약이 있다|1|호텔
book a table|자리를 예약하다|1|식당
under the name|~이름으로|1|호텔
wake-up call|모닝콜|1|호텔
room service|룸서비스|1|호텔
free wifi|무료 와이파이|1|호텔
the wifi password|와이파이 비밀번호|1|호텔
late checkout|늦은 체크아웃|2|호텔
boarding pass|탑승권|1|공항
carry-on|기내 반입 가방|1|공항
window seat|창가 자리|1|공항
aisle seat|통로 자리|1|공항
check a bag|짐을 부치다|1|공항
baggage claim|수하물 찾는 곳|1|공항
lost and found|분실물 센터|1|공항
one way|편도|1|공항
round trip|왕복|1|공항
on vacation|휴가 중|1|공항
on business|출장으로|1|공항
for sightseeing|관광하러|1|공항
how long are you staying|얼마나 머무세요?|1|공항
purpose of your visit|방문 목적|1|공항
anything to declare|신고할 물건|2|공항
for here or to go|드시고 가세요, 가져가세요?|1|식당
to go|가져갈게요(포장)|1|식당
for here|먹고 갈게요|1|식당
take out|포장하다|1|식당
are you ready to order|주문하시겠어요?|1|식당
ready to order|주문할 준비가 된|1|식당
what do you recommend|뭐 추천해요?|1|식당
i'll have|~로 할게요|1|식당
i'll take|~로 할게요, 살게요|1|쇼핑
can i get the check|계산서 주세요|1|식당
the check|계산서|1|식당
the bill|계산서|1|식당
split the bill|나눠서 내다|1|식당
keep the change|잔돈은 괜찮아요|1|식당
on me|내가 낼게|1|식당
it's on me|내가 쏠게|1|식당
refill|리필|1|식당
no ice|얼음 빼 주세요|1|식당
medium rare|미디엄 레어|2|식당
side dish|반찬, 곁들이 음식|1|식당
how much is|~ 얼마예요?|1|쇼핑
how much is it|얼마예요?|1|쇼핑
how much does it cost|얼마예요?|1|쇼핑
on sale|할인 중|1|쇼핑
a good deal|싸게 잘 산 것|1|쇼핑
just looking|그냥 구경하는 중이에요|1|쇼핑
i'm just looking|그냥 보는 중이에요|1|쇼핑
do you have this in|이거 ~(사이즈/색) 있어요?|1|쇼핑
fitting room|탈의실|1|쇼핑
pay by card|카드로 내다|1|쇼핑
pay in cash|현금으로 내다|1|쇼핑
credit card|신용카드|1|쇼핑
get a refund|환불받다|1|쇼핑
exchange it|교환하다|1|쇼핑
too expensive|너무 비싸요|1|쇼핑
where is the|~는 어디 있어요?|1|길
how do i get to|~에 어떻게 가요?|1|길
get to|~에 도착하다, 가다|1|길
go straight|직진하다|1|길
turn left|왼쪽으로 돌다|1|길
turn right|오른쪽으로 돌다|1|길
on the left|왼쪽에|1|길
on the right|오른쪽에|1|길
next to|~ 옆에|1|길
across from|~ 건너편에|1|길
around the corner|모퉁이 돌면 바로|1|길
far from here|여기서 멀다|1|길
within walking distance|걸어갈 수 있는 거리|2|길
take a taxi|택시를 타다|1|길
take the subway|지하철을 타다|1|길
take the bus|버스를 타다|1|길
bus stop|버스 정류장|1|길
subway station|지하철역|1|길
how long does it take|얼마나 걸려요?|1|길
take a picture|사진 찍다|1|여행
could you take a picture|사진 좀 찍어 주실래요?|1|여행
is it okay if|~해도 괜찮아요?|1|여행
do you mind if|~해도 될까요?|2|여행
would you mind|~해 주실래요?|2|여행
could you|~해 주실 수 있나요?|1|여행
can you help me|좀 도와주실래요?|1|여행
i need help|도움이 필요해요|1|여행
speak english|영어를 하다|1|여행
one more time|한 번 더|1|여행
say that again|다시 말해 주세요|1|여행
what do you mean|무슨 뜻이에요?|1|일상
what does that mean|그게 무슨 뜻이에요?|1|일상
how do you say|~는 어떻게 말해요?|1|여행
make sure|확실히 하다, 꼭 ~하다|2|일상
make sense|말이 되다|1|일상
make a mistake|실수하다|1|일상
make friends|친구를 사귀다|1|일상
make money|돈을 벌다|1|회사
make it|해내다, 제시간에 가다|2|일상
take it easy|쉬엄쉬엄 해|1|감정
take a look|한번 보다|1|일상
take a break|잠깐 쉬다|1|회사
have fun|재밌게 놀다|1|일상
have a good time|좋은 시간 보내다|1|일상
have a seat|앉으세요|1|일상
pay attention|주의를 기울이다|2|일상
pay for|~의 값을 내다|1|쇼핑
worry about|~을 걱정하다|1|감정
think about|~에 대해 생각하다|1|일상
talk about|~에 대해 말하다|1|일상
care about|~을 신경 쓰다|2|감정
belong to|~의 것이다|2|일상
agree with|~에 동의하다|1|회사
be good at|~을 잘하다|1|일상
be bad at|~을 못하다|1|일상
be afraid of|~을 무서워하다|1|감정
be proud of|~가 자랑스럽다|1|감정
be sick of|~에 질리다|2|감정
be tired of|~에 지치다|1|감정
be worried about|~가 걱정되다|1|감정
be excited about|~에 신나다|1|감정
be supposed to|~하기로 되어 있다|2|일상
be able to|~할 수 있다|1|일상
in a hurry|급한|1|일상
in time|제때에|2|일상
on time|정각에|1|일상
for good|영원히|3|일상
out of nowhere|난데없이|2|감정
all of a sudden|갑자기|2|일상
at the same time|동시에|1|일상
in the end|결국|1|일상
after all|결국, 어쨌든|2|일상
hit the road|출발하다|3|여행
call it a day|오늘은 여기까지 하다|3|회사
piece of cake|식은 죽 먹기|2|감정
break the ice|어색함을 깨다|3|일상
under the weather|몸이 좀 안 좋은|3|감정
it's not my thing|내 취향이 아니야|2|감정
not my cup of tea|내 취향 아니야|3|감정
get the hang of|요령을 익히다|3|일상
cut it out|그만해|2|감정
knock it off|그만해|3|감정
give it a try|한번 해 보다|1|일상
give it a shot|한번 해 보다|2|일상
give A a hand|A를 도와주다|2|일상
give a hand|도와주다|2|일상
keep an eye on|~을 지켜보다|2|일상
it's worth it|그럴 가치가 있어|2|감정
worth it|그럴 만한|2|감정
make up one's mind|결정하다|2|일상
change one's mind|마음을 바꾸다|1|일상
on one's own|혼자서|2|일상
by oneself|혼자|1|일상
win A over|A를 설득해 내 편으로 만들다|3|감정
put pressure on|~에게 압박을 가하다|3|회사
step in|끼어들다, 나서다|2|회사
had it up to here|참을 만큼 참았다|3|감정
the shit hits the fan|일이 크게 터지다|3|감정
for real|진짜로|1|감정
i'm down|나 콜, 좋아|2|일상
i'm in|나도 낄게|1|일상
count me in|나도 끼워 줘|2|일상
you got this|넌 할 수 있어|1|감정
i'm starving|배고파 죽겠어|1|식당
i'm full|배불러|1|식당
help yourself|마음껏 드세요|1|식당
smells good|냄새 좋다|1|식당
looks good|좋아 보여|1|일상
it's delicious|맛있어요|1|식당
what time is it|몇 시예요?|1|일상
what's going on|무슨 일이야?|1|일상
what happened|무슨 일 있었어?|1|일상
what do you do|무슨 일 해요?(직업)|1|일상
where are you from|어디서 왔어요?|1|여행
first time|처음|1|여행
`;
