'use client';

import React, { useState, useEffect } from 'react';
import "./register-sw";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PlusCircle, History, Trash2, Edit, Pencil } from 'lucide-react';
import type { Course } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LineBarCharts from "@/app/components/LineBarCharts";

const GolfFlagIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 100 150"
    {...props}
  >
    <line x1="20" y1="10" x2="20" y2="140" stroke="black" strokeWidth="4" />
    <rect x="20" y="20" width="60" height="40" fill="red" stroke="black" strokeWidth="1" />
  </svg>
);

// 단일 코스의 총점 계산 (플레이어1 기준)
function getCourseTotalScore(courseScores: any[]): number {
  if (!courseScores || !courseScores.length) return 0;
  let total = 0;
  for (let i = 0; i < courseScores.length; i++) {
    const myScore = courseScores[i][0]; // 플레이어1(본인) 점수
    if (myScore && !isNaN(Number(myScore))) {
      total += Number(myScore);
    }
  }
  return total;
}

// 레코드의 모든 코스 점수 반환
function getAllCourseScores(record: any): {score: number, courseName: string}[] {
  if (!record.allScores || !record.allScores.length) return [];
  
  return record.allScores.map((courseScores: any[], index: number) => ({
    score: getCourseTotalScore(courseScores),
    courseName: record.playedCourses?.[index]?.name || `코스 ${String.fromCharCode(65 + index)}`
  }));
}

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [userName, setUserName] = useState('나');
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [tempUserName, setTempUserName] = useState('');
  // New chart data states for LineBarCharts
  const [monthlyData, setMonthlyData] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [byCourseData, setByCourseData] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [recentRoundsData, setRecentRoundsData] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const router = useRouter();

  const MAX_COURSES_VISIBLE = 3;

  useEffect(() => {
    setIsClient(true);
    const savedCourses = localStorage.getItem('golfCoursesList');
    if (savedCourses) {
      setCourses(JSON.parse(savedCourses));
    }
    const savedName = localStorage.getItem('parkGolfUserName');
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('golfCoursesList', JSON.stringify(courses));
      if (userName && userName !== '나') {
        localStorage.setItem('parkGolfUserName', userName);
      } else {
        localStorage.removeItem('parkGolfUserName');
      }
    }
  }, [courses, userName, isClient]);

  useEffect(() => {
    if (!isClient) return;
    // 기록 불러오기
    const recordsRaw = localStorage.getItem('golfGameRecords');
    if (!recordsRaw) return;
    let records: any[] = [];
    try {
      records = JSON.parse(recordsRaw);
    } catch {
      return;
    }

    // 1. 월별 점수 추이 데이터 (그 달의 모든 코스 점수 합계 / 코스 수)
    const monthlyData: { [key: string]: { totalScore: number, courseCount: number } } = {};
    
    records.forEach((record: any) => {
      const d = new Date(record.date);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const courseScores = getAllCourseScores(record);
      
      if (!monthlyData[ym]) {
        monthlyData[ym] = { totalScore: 0, courseCount: 0 };
      }
      
      // 모든 코스의 점수 합산 및 코스 수 카운트
      courseScores.forEach(course => {
        if (course.score > 0) {
          monthlyData[ym].totalScore += course.score;
          monthlyData[ym].courseCount++;
        }
      });
    });
    
    // 월별 평균 계산
    const monthlyLabels = Object.keys(monthlyData).sort();
    const monthlyAverages = monthlyLabels.map(month => {
      const { totalScore, courseCount } = monthlyData[month];
      return courseCount > 0 ? parseFloat((totalScore / courseCount).toFixed(2)) : 0;
    });
    setMonthlyData({ labels: monthlyLabels, data: monthlyAverages });

    // 2. 구장별 평균 점수 데이터 (구장별 모든 코스 점수 합계 / 코스 수)
    const byCourseData: { [key: string]: { totalScore: number, courseCount: number } } = {};
    
    records.forEach((record: any) => {
      const venueName = record.courseName || "기타";
      const courseScores = getAllCourseScores(record);
      
      if (!byCourseData[venueName]) {
        byCourseData[venueName] = { totalScore: 0, courseCount: 0 };
      }
      
      // 해당 구장의 모든 코스 점수 합산 및 코스 수 카운트
      courseScores.forEach(course => {
        if (course.score > 0) {
          byCourseData[venueName].totalScore += course.score;
          byCourseData[venueName].courseCount++;
        }
      });
    });
    
    // 구장별 평균 계산
    const byCourseLabels = Object.keys(byCourseData);
    const byCourseAverages = byCourseLabels.map(venue => {
      const { totalScore, courseCount } = byCourseData[venue];
      return courseCount > 0 ? parseFloat((totalScore / courseCount).toFixed(2)) : 0;
    });
    setByCourseData({ labels: byCourseLabels, data: byCourseAverages });

    // 4. 최근 라운드별 점수 데이터 (최근 10개 코스)
    interface CourseScore {
      date: Date;
      courseName: string;
      score: number;
      courseLabel: string;
      timestamp: number;
      venueName?: string; // 원본 구장 이름 (선택적 속성)
    }
    
    const allCourses: CourseScore[] = [];
    
    // 모든 기록을 날짜 역순으로 정렬
    const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // 각 라운드의 모든 코스 점수를 추출
    sortedRecords.forEach(record => {
      const recordDate = new Date(record.date);
      const dateLabel = `${recordDate.getMonth() + 1}/${recordDate.getDate()}`;
      
      // 각 코스별로 점수 계산하여 추가
      record.allScores.forEach((courseScores: string[][], courseIndex: number) => {
        if (courseIndex < (record.playedCourses?.length || 0)) {
          // 구장 이름에서 첫 글자 추출 (예: '화천파크골프장' -> '화')
          const venueFirstChar = record.courseName ? record.courseName.charAt(0) : '기';
          // 코스명 추출 (A, B, C...)
          const courseLetter = String.fromCharCode(65 + courseIndex);
          const courseLabel = `${venueFirstChar}${courseLetter}`;
          
          const totalScore = courseScores.reduce((sum: number, holeScores: string[]) => {
            const score = parseInt(holeScores[0], 10); // 플레이어 1의 점수
            return sum + (isNaN(score) ? 0 : score);
          }, 0);
          
          allCourses.push({
            date: recordDate,
            courseName: courseLabel,
            score: totalScore,
            courseLabel: courseLabel, // 예: '화A', '화B', '강A' 등
            timestamp: recordDate.getTime(),
            venueName: record.courseName // 원본 구장 이름 보관 (필요시 사용)
          });
        }
      });
    });
    
    // 타임스탬프 기준으로 정렬 (최신순)
    allCourses.sort((a, b) => b.timestamp - a.timestamp);
    
    // 최근 10개 코스 선택
    const recentCourses = allCourses.slice(0, 10);
    
    // 데이터 포맷팅
    const recentLabels = recentCourses.map(c => c.courseLabel);
    const recentScores = recentCourses.map(c => c.score);
    
    setRecentRoundsData({ 
      labels: recentLabels, 
      data: recentScores 
    });
  }, [isClient]);

  const handleDeleteClick = (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setCourseToDelete(courseId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (courseToDelete) {
      setCourses(courses.filter(course => course.id !== courseToDelete));
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCourseToDelete(null);
  };

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingPars, setEditingPars] = useState<(number | string)[][]>([]);

const handleEditCourse = (e: React.MouseEvent, courseId: string) => {
  e.stopPropagation();
  const course = courses.find(c => c.id === courseId);
  if (course) {
    setEditingCourse(course);
    setEditingPars(course.courses.map(sc => [...sc.pars]));
    setEditDialogOpen(true);
  }
};

const handleEditParChange = (courseIdx: number, holeIdx: number, value: string) => {
  if (!/^\d?$/.test(value)) return;
  setEditingPars(prev => {
    const copy = prev.map(arr => [...arr]);
    copy[courseIdx][holeIdx] = value;
    return copy;
  });
};

const handleEditDialogSave = () => {
  if (!editingCourse) return;
  const updatedCourses = courses.map(c =>
    c.id === editingCourse.id
      ? {
          ...c,
          courses: c.courses.map((sc, i) => ({
            ...sc,
            pars: editingPars[i].map(p => {
              const val = parseInt(String(p), 10);
              return isNaN(val) || val <= 0 ? 3 : val;
            })
          }))
        }
      : c
  );
  setCourses(updatedCourses);
  setEditDialogOpen(false);
};

  const handleNameSave = () => {
    const newName = tempUserName.trim();
    if (newName) {
      setUserName(newName);
    } else {
      setUserName('나');
    }
    setIsNameDialogOpen(false);
  };

  const coursesToShow = courses.length > MAX_COURSES_VISIBLE && !isExpanded
    ? courses.slice(0, MAX_COURSES_VISIBLE)
    : courses;

  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-lg min-h-screen bg-background">
      <header className="text-center my-8">
        <div className="flex items-center justify-center gap-1.5">
          <GolfFlagIcon className="w-8 h-8" />
          <h1 className="text-2xl font-bold whitespace-nowrap select-none cursor-default">
            {userName}의 파크골프
          </h1>
          <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setTempUserName(userName === '나' ? '' : userName)}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>사용자 이름 변경</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="username">이름</Label>
                <Input
                  id="username"
                  value={tempUserName}
                  onChange={e => setTempUserName(e.target.value)}
                  placeholder="사용자 이름을 입력하세요"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNameSave();
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsNameDialogOpen(false)}>취소</Button>
                <Button type="submit" onClick={handleNameSave}>저장</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-2 text-base text-gray-500 font-normal">
          구장을 등록하고 스코어를 관리하세요
        </div>
      </header>

      <main className="space-y-4">
        <h2 className="text-xl font-bold">내 구장 목록</h2>
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {courses.slice(0, 3).map(course => (
              <Card
                key={course.id}
                className="cursor-pointer hover:border-primary transition-colors text-2xl"
                onClick={() => router.push(`/play/${course.id}`)}
              >
                <CardHeader className="p-3 flex flex-row items-center justify-between gap-2">
                  <div className="flex-grow overflow-hidden">
                    <CardTitle className="text-lg font-semibold truncate stadium-name select-none cursor-pointer">{course.name}</CardTitle>
                    <CardDescription className="truncate text-base">{course.courses.length}개 코스 ({course.courses.map(c => c.name).join(', ')}코스)</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => handleEditCourse(e, course.id)} className="w-8 h-8">
                      <Edit className="w-5 h-5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(e, course.id)} className="w-8 h-8">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
            {courses.length > 3 && (
              <Select onValueChange={(id) => router.push(`/play/${id}`)}>
                <SelectTrigger className="w-full h-12 text-base font-semibold bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between px-4 shadow-none">
                  <SelectValue placeholder="더 많은 구장 보기" />
                </SelectTrigger>
                <SelectContent className="text-xl">
                  {courses.slice(3).map(course => (
                    <SelectItem key={course.id} value={course.id} className="text-xl py-4 flex items-center justify-between group">
  <span className="truncate flex-1">{course.name} ({course.courses.length}코스)</span>
  <span className="flex items-center gap-1 ml-2 opacity-80 group-hover:opacity-100">
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8"
      tabIndex={-1}
      onClick={e => {
        e.stopPropagation();
        handleEditCourse(e, course.id);
      }}
    >
      <Edit className="w-5 h-5 text-muted-foreground" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8"
      tabIndex={-1}
      onClick={e => {
        e.stopPropagation();
        handleDeleteClick(e, course.id);
      }}
    >
      <Trash2 className="w-5 h-5 text-destructive" />
    </Button>
  </span>
</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : (
          <Card className="text-center p-8 border-dashed">
            <CardTitle className="text-2xl">등록된 구장이 없습니다</CardTitle>
            <CardDescription className="mt-2 text-lg">아래 버튼으로 구장을 추가해주세요.</CardDescription>
          </Card>
        )}
        <Link href="/add-course">
          <Button className="w-full h-12 text-base mt-4 bg-blue-100 text-blue-700 border border-blue-100 hover:bg-blue-200">
            <PlusCircle className="mr-2 w-5 h-5" />
            새 구장 추가
          </Button>
        </Link>

        {/* 그래프 영역: 새 구장 추가와 기록 보기 사이 */}
        <div className="my-6">
          <LineBarCharts
            monthlyData={monthlyData}
            byCourseData={byCourseData}
            recentRoundsData={recentRoundsData}
          />
        </div>

      {/* 코스별 파수 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>코스별 기본 PAR 수정</DialogTitle>
          </DialogHeader>
          {editingCourse && (
            <div className="space-y-4">
              <div>
                <Label className="block mb-1">구장명</Label>
                <Input value={editingCourse.name} readOnly className="bg-gray-100" />
              </div>
              {editingCourse.courses.map((subCourse, courseIdx) => (
                <Card key={subCourse.name + '-' + courseIdx} className="mb-2">
                  <CardHeader>
                    <CardTitle className="text-lg">{subCourse.name} 코스 PAR 정보</CardTitle>
                  </CardHeader>
                  <CardDescription className="px-4 pb-2 text-base">각 홀의 기본 PAR을 입력하세요</CardDescription>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {subCourse.pars.map((par, holeIdx) => (
                        <div key={holeIdx} className="space-y-1">
                          <Label htmlFor={`edit-par-${courseIdx}-${holeIdx}`} className="text-sm">{holeIdx + 1}번 홀</Label>
                          <Input
  id={`edit-par-${courseIdx}-${holeIdx}`}
  type="tel"
  value={editingPars[courseIdx]?.[holeIdx] ?? ''}
  onChange={e => handleEditParChange(courseIdx, holeIdx, e.target.value)}
  onFocus={e => e.target.select()}
  placeholder="3"
  className="h-10 text-center"
  maxLength={1}
/>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditDialogOpen(false)}>취소</Button>
            <Button onClick={handleEditDialogSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>구장 삭제</DialogTitle>
            <DialogDescription>
              이 구장을 정말로 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>취소</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="mt-8 text-center space-y-4">
        <Link href="/records">
          <Button className="w-full h-12 text-base">
            <History className="mr-2" />
            기록 보기
          </Button>
        </Link>
      </footer>
    </div>
  );
}