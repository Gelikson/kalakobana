const submitAnswers = useCallback(async (round: number, answers: Answers) => {
  const pid = metaRef.current?.id;
  if (!pid) return;

  const currentLetter = gameRef.current?.letter || '';

  // 1. დავაკოპიროთ პასუხები
  const validatedAnswers: Answers = { ...answers };

  // 2. პარალელურად დაველოდოთ AI-ს ყველა კატეგორიის შემოწმებაზე
  const validationPromises = Object.entries(answers).map(async ([category, word]) => {
    const cleanWord = typeof word === 'string' ? word.trim() : '';

    if (!cleanWord) {
      (validatedAnswers as Record<string, string>)[category] = '';
      return;
    }

    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: cleanWord,
          category: category,
          letter: currentLetter,
        }),
      });

      const data = await res.json();

      if (data.isValid) {
        (validatedAnswers as Record<string, string>)[category] = cleanWord;
      } else {
        console.log(`❌ AI-მ უარყო: "${cleanWord}" (${category}) - ${data.reason}`);
        // უარყოფილი სიტყვა ცარიელდება, რის გამოც ქულების დათვლისას 0 ქულა დაეწერება
        (validatedAnswers as Record<string, string>)[category] = '';
      }
    } catch (err) {
      console.error('Validation error:', err);
    }
  });

  // 🛑 აუცილებელი ხაზი: ველოდებით AI-ს ყველა პასუხის დასრულებას
  await Promise.all(validationPromises);

  // 3. მხოლოდ AI-ს შემოწმების დასრულების შემდეგ ვაგზავნით გასუფთავებულ პასუხებს
  if (hostRef.current) {
    const s = gameRef.current;
    if (s && s.phase === 'playing' && s.round === round) {
      submissionsRef.current[pid] = validatedAnswers;
      maybeFinishEarly();
    }
  } else {
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'submit',
      payload: { playerId: pid, round, answers: validatedAnswers },
    });
  }
}, [maybeFinishEarly]);
