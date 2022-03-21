/*----name----*/: (/*----args----*/) => {
    const fake_code = /*----fake_code----*/
    if (fake_code.status < 200 && fake_code.status > 299)
        throw new Error(`Fetch Error: ${fake_code.status} ${fake_code.statusText ?? ''}`)
    return /*----fake_response----*/
},