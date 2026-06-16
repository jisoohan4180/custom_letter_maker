import { describe, it, expect } from 'vitest'
import { parseCsvInfo, splitCsvLine, findMissingColumns } from '../lib/csv'

describe('splitCsvLine', () => {
  it('쉼표로 컬럼을 분리한다', () => {
    expect(splitCsvLine('이름,연락처,기수')).toEqual(['이름', '연락처', '기수'])
  })

  it('따옴표 안의 쉼표는 분리하지 않는다', () => {
    expect(splitCsvLine('이름,"서울, 강남",기수')).toEqual(['이름', '서울, 강남', '기수'])
  })

  it('연속 따옴표는 이스케이프된 따옴표로 처리한다', () => {
    expect(splitCsvLine('"a""b",c')).toEqual(['a"b', 'c'])
  })
})

describe('parseCsvInfo', () => {
  it('헤더 컬럼과 데이터 행 수를 반환한다', () => {
    const info = parseCsvInfo('이름,연락처\n홍길동,010-1111\n김철수,010-2222')
    expect(info.columns).toEqual(['이름', '연락처'])
    expect(info.rowCount).toBe(2)
  })

  it('UTF-8 BOM을 제거한다', () => {
    const info = parseCsvInfo('﻿이름,연락처\n홍길동,010')
    expect(info.columns).toEqual(['이름', '연락처'])
  })

  it('빈 줄은 행 수에서 제외한다', () => {
    const info = parseCsvInfo('이름\n홍길동\n\n')
    expect(info.rowCount).toBe(1)
  })

  it('데이터 행이 없으면 rowCount는 0', () => {
    const info = parseCsvInfo('이름,연락처')
    expect(info.rowCount).toBe(0)
  })
})

describe('findMissingColumns', () => {
  it('필수 컬럼 중 없는 것을 반환한다', () => {
    expect(findMissingColumns(['연락처', '기수'], ['이름'])).toEqual(['이름'])
  })

  it('필수 컬럼이 모두 있으면 빈 배열', () => {
    expect(findMissingColumns(['이름', '연락처'], ['이름'])).toEqual([])
  })
})
